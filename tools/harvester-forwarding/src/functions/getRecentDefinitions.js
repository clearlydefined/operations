const { app } = require("@azure/functions");
const { MongoClient } = require("mongodb");

app.http("getRecentDefinitions", {
  methods: ["GET"],
  authLevel: "anonymous",
  handler: async (request, context) => {
    context.log(`Http function processed request for url "${request.url}"`);

    try {
      const daysBack = parseInt(request.query.get("days"));
      if (!daysBack || isNaN(daysBack) || daysBack < 1 || daysBack > 30) {
        return { status: 400, body: "days must be a number between 1 and 30" };
      }
      const limitPerTypeAndDay = parseInt(request.query.get("limit"));
      if (
        !limitPerTypeAndDay ||
        isNaN(limitPerTypeAndDay) ||
        limitPerTypeAndDay < 1 ||
        limitPerTypeAndDay > 100
      ) {
        return {
          status: 400,
          body: "limitPerType must be a number between 1 and 100",
        };
      }

      return await getData(context, daysBack, limitPerTypeAndDay);
    } catch (error) {
      context.log(`Error: ${error.message}`);
      return { status: 500, body: `An error occurred: ${error.message}` };
    }
  },
});

async function getData(context, days, limitPerType) {
  const connectionString = process.env.COSMOSDB_CONNECTION_STRING;
  const dbName = process.env.COSMOSDB_DATABASE_NAME;
  const collectionName = process.env.COSMOSDB_COLLECTION_NAME;

  const groupLimit = 30;

  if (!connectionString) {
    return { status: 500, body: "Database connection string not configured" };
  }

  try {
    const client = await MongoClient.connect(connectionString);
    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    const aggregationPipeline = [
      // Limit the date range to the last N days
      {
        $match: {
          "_meta.updated": {
            $gt: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
          },
        },
      },
    
      // Project necessary fields and add a day field
      {
        $project: {
          _id: 1,
          "coordinates.type": 1,
          "_meta.updated": 1,
          day: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: { $toDate: "$_meta.updated" },
            },
          },
        },
      },
    
      // Group by type and day
      {
        $group: {
          _id: {
            type: "$coordinates.type",
            day: "$day",
          },
          documents: {
            $push: {
              _id: "$_id",
              updated: "$_meta.updated",
            },
          },
        },
      },
    
      // Slice to get only the first limitPerType documents per day
      {
        $project: {
          _id: 1,
          documents: { $slice: ["$documents", limitPerType] },
        },
      },
    
      // Group by type to combine all days
      {
        $group: {
          _id: "$_id.type",
          documents: { $push: "$documents" },
        },
      },
    
      // Flatten the documents array and limit to limitPerType * days
      {
        $project: {
          documents: {
            $slice: [
              { $reduce: {
                input: "$documents",
                initialValue: [],
                in: { $concatArrays: ["$$value", "$$this"] }
              }},
              limitPerType * days
            ]
          }
        }
      },
    
      // Optional: Limit the number of types returned
      { $limit: groupLimit },
    ];

    // Use this aggregation pipeline in your Azure Function
    const result = await collection
      .aggregate(aggregationPipeline, {
        maxTimeMS: 120000, // 2 minutes timeout
        allowDiskUse: true, // Allow using disk for large aggregations
      })
      .toArray();

    await client.close();

    return {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(result.flatMap((r) => r.documents.map((d) => d._id)))
    };
      
       
  } catch (error) {
    context.log(`CosmosDB Error: ${error.message}`);
    return { status: 500, body: `An error occurred: ${error.message}` };
  }
}
