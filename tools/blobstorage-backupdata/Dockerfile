# Use the official image as a parent image
FROM mcr.microsoft.com/dotnet/runtime:7.0-alpine AS base
LABEL org.opencontainers.image.source="https://github.com/clearlydefined/operations"
LABEL org.opencontainers.image.description="ClearlyDefined publish changes job"
WORKDIR /app

# Use the SDK image to build the app
FROM mcr.microsoft.com/dotnet/sdk:7.0-alpine AS build
WORKDIR /src
COPY ["BackupData.csproj", "BackupData/"]
RUN dotnet restore "BackupData/BackupData.csproj"
COPY . .
WORKDIR "/src"
RUN dotnet build "BackupData.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "BackupData.csproj" -c Release -o /app/publish

# Copy the build app to the base image and define entry point
FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "BackupData.dll"]
