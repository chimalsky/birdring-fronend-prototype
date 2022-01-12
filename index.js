export {default} from './birdring.js';

const selectedDatumEl = document.querySelector('#selectedDatum');

window.addEventListener('datumSelected', ev => {
    const datum = ev.detail;
    selectedDatumEl.innerHTML = datum.name;
})