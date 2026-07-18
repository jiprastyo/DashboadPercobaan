const url = 'https://jiprastyo.github.io/arsiptakresmi/styles.css';
fetch(url).then(r => r.text()).then(css => {
  const root = css.match(/:root\s*{([^}]+)}/);
  if (root) {
    console.log(root[1]);
  } else {
    console.log(css.substring(0, 500));
  }
});
