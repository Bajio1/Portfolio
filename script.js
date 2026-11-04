// =========================================================
// 1. LE SON DE GUITARE
// On fabrique le son d'une corde pincée directement dans le
// navigateur (algorithme de Karplus-Strong), sans fichier audio.
// =========================================================
let audio = null;      // créé au premier clic (les navigateurs l'exigent)
let sonActive = true;

function pincerCorde(frequence, delai = 0) {
  if (!audio) audio = new AudioContext();

  const echantillons = audio.sampleRate;
  const duree = 1.8;                                   // en secondes
  const buffer = audio.createBuffer(1, echantillons * duree, echantillons);
  const sortie = buffer.getChannelData(0);

  // Une courte rafale de bruit, qui va « résonner » comme une corde
  const periode = Math.round(echantillons / frequence);
  const corde = new Float32Array(periode).map(() => Math.random() * 2 - 1);

  for (let i = 0; i < sortie.length; i++) {
    const j = i % periode;
    sortie[i] = corde[j];
    // On adoucit petit à petit : c'est ce qui donne le son de corde
    corde[j] = 0.5 * (corde[j] + corde[(j + 1) % periode]) * 0.996;
  }

  const source = audio.createBufferSource();
  const volume = audio.createGain();
  volume.gain.value = 0.25;
  source.buffer = buffer;
  source.connect(volume).connect(audio.destination);
  source.start(audio.currentTime + delai);
}

// Un petit accord gratté : la note, sa quinte et son octave
function gratter(frequence) {
  pincerCorde(frequence, 0);
  pincerCorde(frequence * 1.5, 0.03);
  pincerCorde(frequence * 2, 0.06);
}

// =========================================================
// 2. LES CASES DU MANCHE
// =========================================================
const cases = document.querySelectorAll(".case");

cases.forEach((caseManche) => {
  caseManche.addEventListener("click", () => {
    if (sonActive) gratter(Number(caseManche.dataset.note));

    // Relance la vibration des cordes
    caseManche.classList.remove("vibre");
    void caseManche.offsetWidth;   // astuce pour redémarrer l'animation
    caseManche.classList.add("vibre");
  });

  caseManche.addEventListener("animationend", () => {
    caseManche.classList.remove("vibre");
  });
});

// =========================================================
// 3. BOUTON SON
// =========================================================
const boutonSon = document.querySelector(".son");

boutonSon.addEventListener("click", () => {
  sonActive = !sonActive;
  boutonSon.setAttribute("aria-pressed", sonActive);
  boutonSon.textContent = sonActive ? "Son activé" : "Son coupé";
});

// =========================================================
// 4. LE MÉDIATOR SUIT LA SECTION OÙ L'ON SE TROUVE
// =========================================================
const sections = document.querySelectorAll("main section");
const haut = document.querySelector(".haut");

function majMediator() {
  // La section active est la dernière dont le haut est passé sous le manche
  let actuelle = sections[0];
  sections.forEach((s) => {
    if (s.getBoundingClientRect().top <= haut.offsetHeight + 100) actuelle = s;
  });

  // Tout en bas de la page, on active la dernière section (Contact)
  if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 2) {
    actuelle = sections[sections.length - 1];
  }

  cases.forEach((c) => {
    const estActive = c.getAttribute("href") === "#" + actuelle.id;
    c.classList.toggle("active", estActive);
    if (estActive) c.setAttribute("aria-current", "true");
    else c.removeAttribute("aria-current");
  });
}

window.addEventListener("scroll", majMediator, { passive: true });
window.addEventListener("resize", majMediator);
majMediator();   // une première fois au chargement de la page