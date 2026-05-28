/**
 * Entry helpers for BLAGAJNA WEB.
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu(APP_CONFIG.APP_NAME)
    .addItem('Initialize database', 'initializeDatabase')
    .addToUi();
}
