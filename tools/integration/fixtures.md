## Notes on Fixtures

The ScanCode update resulted in regressed fixtures that need to be addressed in the future. A complete description of differences can be found in the [provided documentation](https://docs.google.com/document/d/1si5zAXg5XyoC5Loip5BIq3vZHvd8Zu2gmhrd_eG6TYE/edit?tab=t.0). Here are the summary for each case:

1.  pypi/pypi/-/platformdirs/4.2.0

- The differences in scores are due to a [regression in copyright detection](https://github.com/clearlydefined/service/pull/1056#issuecomment-2184400127) in ScanCode v32. This was discussed in the dev meeting and it was decided for Jeff to file an issue with ScanCode ([meeting minutes on 2024-08-21](https://docs.google.com/document/d/1n5WKbXwmDRKZfQPbxHXJK9AOBxpbigzcQ6C7_IW8-oE/edit?tab=t.0))
- This regression also causes differences in notices generated, so a fixture for notice is added to reflect the difference.

2.  conda/conda-forge/linux-aarch64/numpy/1.16.6-py36hdc1b780_0

- 12 files reported different licenses [due to 'unknown-license-reference'](https://github.com/clearlydefined/service/issues/1183#issuecomment-2343849195) in v32 Scancode.
- The order of the copyright year in the notices has been changed as well.

3.  pypi/pypi/-/sdbus/0.12.0

- There is a difference in the declared license compared to the previous definition, which seems to be a regression in ScanCode.
  - The previous declared license: 'GPL-2.0 AND LGPL-2.0-or-later AND LGPL-2.1-or-later', and here are the tools contributing to this answer:
    - licensee: "declared": "GPL-2.0"
    - clearlydefined, "declared": "LGPL-2.0-or-later"
    - scancode v30: "declared": "LGPL-2.1-or-later"

  - In the actual declared license: 'GPL-1.0-or-later AND GPL-2.0 AND LGPL-2.0-or-later AND LGPL-2.1-only AND LGPL-2.1-or-later AND Python-2.0', and here are the tools contributing to this answer:
    - licensee: "declared": "GPL-2.0"
    - clearlydefined, "declared": "LGPL-2.0-or-later"
    - scancode v32: "declared": "LGPL-2.1-or-later AND Python-2.0 AND LGPL-2.1-only AND LGPL-2.0-or-later AND GPL-1.0-or-later"

- Jeff’s comment at https://github.com/clearlydefined/service/pull/1056#issuecomment-2288986098.
- The declared license information is reflected in notices, and therefore, the notices were patched as well.

4.  nuget/nuget/-/NuGet.Protocol/6.7.1

- One file was detected to be different from the previous definition due to the use of ScanCode result directly without local filtering of lower scored license match conducted previously. An analysis can be found at https://github.com/clearlydefined/service/pull/1056#issuecomment-2209603879.
- Jeff confirm that the v32 declared license is incorrect in his comment at https://github.com/clearlydefined/service/pull/1056#issuecomment-2211449254. So we need to file an issue to ScanCode

5.  git/github/ratatui-org/ratatui/bcf43688ec4a13825307aef88f3cdcd007b32641

- One file license was detected to be different from the previous definition, but based on [Jeff’s comments](https://github.com/clearlydefined/service/pull/1056#issuecomment-2197103324), both are not correct. This difference can be ignored, and fixtures to be updated.
