/**
 * Web App entry point.
 */
function doGet(e) {
  const allowedPages = ['index', 'mobile', 'desktop'];
  const requestedPage = e && e.parameter && e.parameter.page ? e.parameter.page : 'index';
  const page = allowedPages.indexOf(requestedPage) === -1 ? 'index' : requestedPage;
  const template = HtmlService.createTemplateFromFile('html/' + page);

  return template.evaluate()
    .setTitle(APP_CONFIG.APP_NAME)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
