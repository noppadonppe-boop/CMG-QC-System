# Google Sheet Tag No Sync

Use the `syncGoogleSheetTagNos` Firebase Function to send `Tag No.` values from Google Sheet range `D3:D` into the QC system.
You can also send a prefix such as `อาคาร:A`, `อาคาร:B`, or `อาคาร:C`. The system will save the combined value, for example `อาคาร:A TAG-001`.
If the same combined value is sent again, it will be skipped and only brand-new items will be created.

## Required values

- `projectId` from Firestore for the target project
- deployed Cloud Function URL
- `TAG_SYNC_SECRET`
- optional prefix/building value such as `อาคาร:A`

You can store the deployed webhook URL in the root `.env` as `VITE_GOOGLE_TAG_SYNC_WEBHOOK_URL`.

## Secret setup

Use the existing root `.env` file and add:

```env
VITE_GOOGLE_TAG_SYNC_WEBHOOK_URL=https://asia-southeast1-YOUR_FIREBASE_PROJECT.cloudfunctions.net/syncGoogleSheetTagNos
TAG_SYNC_SECRET=replace-with-a-long-random-secret
```

When deploying, run `npm run deploy:tag-sync`. The deploy script reads the same root `.env` file and pushes `TAG_SYNC_SECRET` to Firebase runtime config before deploying the function.

## Google Apps Script

```javascript
const CONFIG = {
  projectId: 'PUT_YOUR_PROJECT_ID_HERE',
  webhookUrl: 'https://asia-southeast1-YOUR_FIREBASE_PROJECT.cloudfunctions.net/syncGoogleSheetTagNos',
  secret: 'PUT_THE_SAME_TAG_SYNC_SECRET_HERE',
  prefix: 'อาคาร:A',
  sheetName: 'Sheet1',
  range: 'D3:D',
};

function syncTagNosToQcSystem() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.sheetName);
  if (!sheet) {
    throw new Error(`Sheet not found: ${CONFIG.sheetName}`);
  }

  const values = sheet.getRange(CONFIG.range).getValues()
    .flat()
    .map((value) => String(value || '').trim())
    .filter(Boolean);

  const payload = {
    secret: CONFIG.secret,
    projectId: CONFIG.projectId,
    prefix: CONFIG.prefix,
    spreadsheetId: SpreadsheetApp.getActiveSpreadsheet().getId(),
    sheetName: sheet.getName(),
    range: CONFIG.range,
    values,
  };

  const response = UrlFetchApp.fetch(CONFIG.webhookUrl, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });

  Logger.log(response.getContentText());
}

function onEdit(e) {
  const range = e.range;
  const sheet = range.getSheet();
  if (sheet.getName() !== CONFIG.sheetName) return;
  if (range.getColumn() !== 4) return;
  if (range.getRow() < 3) return;
  syncTagNosToQcSystem();
}
```

## Setup steps

1. Deploy Firebase Functions.
2. Copy the `syncGoogleSheetTagNos` function URL into `webhookUrl`.
3. Open Google Sheet, then go to `Extensions > Apps Script`.
4. Paste the script and update `projectId`, `webhookUrl`, `secret`, and `sheetName`.
5. Set `prefix` to the building value you want, such as `อาคาร:A`.
6. Run `syncTagNosToQcSystem()` once to send the current full list.
7. Add an installable trigger for `onEdit` if you want automatic sync whenever column D changes.
