export default {
  heightCalculationMethod () {
    const body = document.body;
    const html = document.documentElement;

    return Math.max.apply(null, [
      body.scrollHeight,
      body.offsetHeight,
      html.offsetHeight
    ]);
  }
}
