/* global document */
export default {
  heightCalculationMethod() {
    const { body, documentElement: html } = document;

    return Math.max.apply(null, [
      body.scrollHeight,
      body.offsetHeight,
      html.offsetHeight,
    ]);
  },
};
