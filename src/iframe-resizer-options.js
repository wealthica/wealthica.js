module.exports = {
  heightCalculationMethod () {
    let mainContainer = document.getElementById('main_container');

    return mainContainer ? mainContainer.scrollHeight : document.body.scrollHeight;
  }
}
