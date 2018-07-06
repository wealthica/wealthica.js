export default {
  heightCalculationMethod () {
    let body = document.body;
    let html = document.documentElement;

    return Math.max.apply(null, [
      body.scrollHeight,
      body.offsetHeight,
      html.clientHeight,
      html.scrollHeight,
      html.offsetHeight
    ]);
  }
}
