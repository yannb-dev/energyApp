# Calcul du D+ — méthode retenue pour SPEC-07.1

Objectif : retrouver le D+ annoncé par Openrunner, à ±50 m près.

| Fichier         | Points | Distance | D+ cible |
| --------------- | ------ | -------- | -------- |
| `asset/bike.gpx` | 3367   | 93,7 km  | 1902 m   |
| `asset/run.gpx`  | 1722   | 23,1 km  | 1289 m   |

## 1. Pourquoi le précédent calcul était faux

Les altitudes Openrunner viennent d'un modèle de terrain, arrondies au mètre. Elles contiennent beaucoup de petites oscillations (escaliers de ±1 à 3 m). En additionnant toutes les montées, on compte ce bruit comme du vrai dénivelé.

L'ancienne SPEC prévoyait :

- un rééchantillonnage tous les 100 m ;
- puis une moyenne glissante sur **50 m**.

Problème : avec des points espacés de 100 m, une fenêtre de 50 m (±25 m) ne contient que le point lui-même. **Le lissage ne fait donc rien.** L'hystérésis de 3 m ne suffit pas à elle seule à absorber le bruit.

## 2. Mesures (script Python de contrôle)

| Méthode                                                     | bike (1902) | run (1289) |
| ----------------------------------------------------------- | ----------- | ---------- |
| Somme brute des montées entre points GPX                    | 2845        | 2086       |
| Points bruts + hystérésis 3 m                               | 2662        | 1949       |
| Ancienne SPEC : pas de 100 m, fenêtre de 50 m, hystérésis 3 m | 2272        | 1551       |
| **Nouvelle SPEC : pas de 100 m, fenêtre de 300 m, hystérésis 3 m** | **1898 (−4)** | **1304 (+15)** |
| Contrôle : pas de 10 m, fenêtre de 300 m, hystérésis 3 m    | 1896        | 1288       |

Les deux cibles sont atteintes, largement dans la marge de 50 m.

### Sensibilité à la fenêtre (pas de 10 m, hystérésis 3 m)

| Fenêtre | bike | run  | Les deux dans ±50 m ? |
| ------- | ---- | ---- | --------------------- |
| 100 m   | 2177 | 1499 | non                   |
| 200 m   | 1982 | 1352 | non                   |
| 250 m   | 1941 | 1316 | oui                   |
| **300 m** | **1896** | **1288** | **oui (centre)** |
| 400 m   | 1863 | 1251 | oui (limite)          |
| 500 m   | 1828 | 1225 | non                   |

300 m est au centre de la zone qui fonctionne. Avec une fenêtre de 300 m, le seuil d'hystérésis compte peu : on reste dans la marge pour tout seuil de 0 à 10 m.

## 3. Méthode pas à pas

1. **Distance** : haversine (R = 6371 km) entre points consécutifs, cumulée. Un point à moins de 1 m du précédent est ignoré.
2. **Rééchantillonnage** : un point tous les 100 m, dont l'altitude est interpolée linéairement sur la distance. Le point final de la trace est ajouté.
3. **Lissage** : chaque altitude devient la moyenne des points distants d'au plus 150 m (au pas de 100 m : i−1, i, i+1). Aux bords, la fenêtre est réduite **symétriquement**. Le 1er et le dernier point gardent donc leur valeur. Avec une fenêtre simplement tronquée, une rampe régulière de 50 m ne donnerait que 45 m.
4. **Hystérésis par extremums** (seuil de 3 m) sur l'altitude lissée :

```
up = 0; down = 0
anchor = e[0]; extreme = e[0]; state = 0   // 0 indéterminé, 1 montée, -1 descente
pour chaque altitude x :
  si state >= 0 :
    extreme = max(extreme, x)
    si state == 0 et x - anchor > seuil : state = 1
    si state == 1 et extreme - x > seuil :      // inversion : sommet validé
      up += extreme - anchor; anchor = extreme; extreme = x; state = -1
    sinon si state == 0 et anchor - x > seuil :  // départ en descente
      state = -1; extreme = x   // (l'ancrage reste e[0] pour compter la descente)
  sinon :
    extreme = min(extreme, x)
    si x - extreme > seuil :                     // inversion : creux validé
      down += anchor - extreme; anchor = extreme; extreme = x; state = 1
fin : si state == 1 : up += extreme - anchor
      si state == -1 : down += anchor - extreme
```

Le D+ est `up` et le D− est `down`.

## 4. Effet sur les autres exemples de la SPEC

| Exemple                              | Résultat                       |
| ------------------------------------ | ------------------------------ |
| 2. Rampe de 5 % sur 1 km (100 → 150) | D+ = 50 (fenêtre symétrique)   |
| 3. Bruit ±2 m sur terrain plat       | D+ = 0                         |
| 4. Aller-retour ±100 m sur 2 × 1 km  | D+ ≈ D− ≈ 93 (sommet arrondi par le lissage) |

D'où la tolérance de l'exemple 4, élargie à 90–105.

## 5. Limites

- Le lissage sur 300 m écrête les petites bosses de moins de ~150 m de long. C'est voulu : le profil du modèle de terrain n'y est pas fiable.
- Calibré sur deux traces Openrunner (Alpes). Une trace d'un autre outil (barométrique, Strava) pourrait demander un autre réglage. Le test d'intégration (exemple 10) servira de garde-fou.
