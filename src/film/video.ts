// Where the film lives outside this page. The YouTube upload is the fallback for browsers that cannot run the live
// film; the edition's PDF button on the last page stays hidden until the file exists.
export const YOUTUBE_ID = 'fEKCQ_wuda4';
export const YOUTUBE_URL = `https://youtu.be/${YOUTUBE_ID}`;
/** Path of the published 2026 edition (a PDF in public/), or '' until there is one: the PDF button is hidden while it is empty. */
export const EDITION_PDF = '';
