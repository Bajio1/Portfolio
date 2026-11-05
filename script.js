let contexteAudio = null;
let entreeSon = null;
let sonActif = true;

function creerReverb(contexte) {
  const duree = 1.4;
  const taille = Math.floor(contexte.sampleRate * duree);
  const impulsion = contexte.createBuffer(2, taille, contexte.sampleRate);

  for (let canal = 0; canal < 2; canal++) {
    const donnees = impulsion.getChannelData(canal);
    for (let index = 0; index < taille; index++) {
      donnees[index] = (Math.random() * 2 - 1) * Math.pow(1 - index / taille, 3);
    }
  }

  const reverb = contexte.createConvolver();
  reverb.buffer = impulsion;
  return reverb;
}

function creerFiltre(contexte, type, frequence, q, gain = 0) {
  const filtre = contexte.createBiquadFilter();
  filtre.type = type;
  filtre.frequency.value = frequence;
  filtre.Q.value = q;
  filtre.gain.value = gain;
  return filtre;
}

function preparerAudio() {
  if (!contexteAudio) {
    contexteAudio = new AudioContext();

    const caisseGrave = creerFiltre(contexteAudio, "peaking", 110, 1.2, 5);
    const caisseMedium = creerFiltre(contexteAudio, "peaking", 230, 1.5, 3);
    const douceur = creerFiltre(contexteAudio, "lowpass", 5000, 0.5);
    const reverb = creerReverb(contexteAudio);
    const niveauReverb = contexteAudio.createGain();
    niveauReverb.gain.value = 0.18;

    const compresseur = contexteAudio.createDynamicsCompressor();
    compresseur.threshold.value = -14;
    compresseur.ratio.value = 3;

    caisseGrave.connect(caisseMedium).connect(douceur).connect(compresseur);
    douceur.connect(reverb).connect(niveauReverb).connect(compresseur);
    compresseur.connect(contexteAudio.destination);

    entreeSon = caisseGrave;
  }

  if (contexteAudio.state === "suspended") {
    contexteAudio.resume();
  }
}

function pincerCorde(frequence, delai = 0, niveau = 0.25) {
  preparerAudio();

  const frequenceEchantillonnage = contexteAudio.sampleRate;
  const duree = 3;
  const longueur = Math.floor(frequenceEchantillonnage * duree);
  const buffer = contexteAudio.createBuffer(1, longueur, frequenceEchantillonnage);
  const echantillonsAudio = buffer.getChannelData(0);

  const periodeExacte = frequenceEchantillonnage / frequence;
  const periode = Math.round(periodeExacte);

  const bruit = new Float32Array(periode);
  let precedent = 0;
  for (let index = 0; index < periode; index++) {
    precedent += 0.45 * (Math.random() * 2 - 1 - precedent);
    bruit[index] = precedent;
  }

  const decalage = Math.max(1, Math.round(periode * 0.12));
  const corde = bruit.map((valeur, index) => valeur - 0.9 * bruit[(index + decalage) % periode]);

  let maximum = 0;
  corde.forEach((valeur) => {
    maximum = Math.max(maximum, Math.abs(valeur));
  });
  for (let index = 0; index < periode; index++) {
    corde[index] /= maximum || 1;
  }

  const amortissement = 0.9985 - frequence * 0.000004;

  for (let index = 0; index < longueur; index++) {
    const position = index % periode;
    echantillonsAudio[index] = corde[position];
    corde[position] = amortissement * 0.5 * (corde[position] + corde[(position + 1) % periode]);
  }

  const debut = contexteAudio.currentTime + delai;
  const sourceAudio = contexteAudio.createBufferSource();
  sourceAudio.buffer = buffer;
  sourceAudio.playbackRate.value = periode / periodeExacte;

  const volume = contexteAudio.createGain();
  volume.gain.setValueAtTime(niveau, debut);
  volume.gain.setValueAtTime(niveau, debut + duree - 0.4);
  volume.gain.linearRampToValueAtTime(0, debut + duree);

  sourceAudio.connect(volume).connect(entreeSon);
  sourceAudio.start(debut);
}

const accords = {
  sol: [98.0, 123.47, 146.83, 196.0, 246.94, 392.0],
  do: [130.81, 164.81, 196.0, 261.63, 329.63],
  re: [146.83, 220.0, 293.66, 369.99],
  mim: [82.41, 123.47, 164.81, 196.0, 246.94, 329.63],
  lam: [110.0, 164.81, 220.0, 261.63, 329.63],
  mi: [82.41, 123.47, 164.81, 207.65, 246.94, 329.63],
  la: [110.0, 164.81, 220.0, 277.18, 329.63],
  rem: [146.83, 220.0, 293.66, 349.23],
  mim7: [82.41, 123.47, 164.81, 196.0, 293.66, 329.63],
};

function jouerAccord(nomAccord) {
  const notes = accords[nomAccord];
  if (!notes) return;

  notes.forEach((frequence, index) => {
    const delai = index * 0.035 + Math.random() * 0.01;
    const niveau = 0.16 - index * 0.008;
    pincerCorde(frequence, delai, niveau);
  });
}

function jouerArpege() {
  pincerCorde(261.63, 0, 0.22);
  pincerCorde(329.63, 0.14, 0.2);
  pincerCorde(392.0, 0.28, 0.2);
  pincerCorde(523.25, 0.42, 0.18);
}

const boutonSon = document.querySelector(".son");

boutonSon.addEventListener("click", () => {
  sonActif = !sonActif;
  boutonSon.setAttribute("aria-pressed", sonActif);
  boutonSon.textContent = sonActif ? "Son activé" : "Son coupé";
});

const liensNavigation = document.querySelectorAll(".case");

liensNavigation.forEach((lien) => {
  lien.addEventListener("click", () => {
    if (sonActif) {
      jouerAccord(lien.dataset.accord);
    }

    lien.classList.remove("vibre");
    void lien.offsetWidth;
    lien.classList.add("vibre");
  });

  lien.addEventListener("animationend", () => {
    lien.classList.remove("vibre");
  });
});

const sections = document.querySelectorAll("main section");
const entete = document.querySelector(".haut");

function mettreAJourNavigation() {
  let sectionActive = sections[0];

  sections.forEach((section) => {
    if (section.getBoundingClientRect().top <= entete.offsetHeight + 100) {
      sectionActive = section;
    }
  });

  if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 2) {
    sectionActive = sections[sections.length - 1];
  }

  liensNavigation.forEach((lien) => {
    const estActif = lien.getAttribute("href") === `#${sectionActive.id}`;
    lien.classList.toggle("active", estActif);

    if (estActif) {
      lien.setAttribute("aria-current", "true");
    } else {
      lien.removeAttribute("aria-current");
    }
  });
}

window.addEventListener("scroll", mettreAJourNavigation, { passive: true });
window.addEventListener("resize", mettreAJourNavigation);
mettreAJourNavigation();

const formulaire = document.querySelector(".formulaire");
const statut = document.querySelector(".formulaire-statut");

if (formulaire) {
  formulaire.addEventListener("submit", async (evenement) => {
    evenement.preventDefault();

    if (sonActif) {
      preparerAudio();
    }

    statut.textContent = "Envoi en cours…";

    try {
      const reponse = await fetch(formulaire.action, {
        method: "POST",
        body: new FormData(formulaire),
        headers: { Accept: "application/json" },
      });

      if (reponse.ok) {
        formulaire.reset();
        statut.textContent = "Merci ! Ton message est bien parti, je te réponds vite.";
        if (sonActif) {
          jouerArpege();
        }
      } else {
        statut.textContent = "Oups, l’envoi a échoué. Réessaie dans un instant.";
      }
    } catch {
      statut.textContent = "Problème de connexion. Vérifie ta connexion et réessaie.";
    }
  });
}