/* VicThree Vocab — site config.
   LEAD CAPTURE (welcome popup -> Google Form -> Sheet).
   Paste the Google Form action URL and the three "entry.xxxx" field ids below.
   Leave them blank to keep the popup fully working without recording yet. */
window.VV_CONFIG = {
  googleForm: {
    action: "",                                   // .../formResponse
    fields: { name: "", phone: "", email: "" }    // entry.xxxx ids
  }
};
