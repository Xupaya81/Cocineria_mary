import { writeFileSync } from "node:fs";
const shell = (body, bg = "#eadfc8") =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600"><defs><filter id="s"><feDropShadow dx="0" dy="12" stdDeviation="14" flood-opacity=".15"/></filter><pattern id="cloth" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M0 0H40V40" fill="none" stroke="#fff" stroke-opacity=".2"/></pattern></defs><rect width="800" height="600" fill="${bg}"/><rect width="800" height="600" fill="url(#cloth)"/>${body}</svg>`;
const plate =
  '<ellipse cx="400" cy="310" rx="258" ry="224" fill="#faf8ed" filter="url(#s)"/><ellipse cx="400" cy="310" rx="220" ry="187" fill="none" stroke="#dbd5c5" stroke-width="3"/>';
const leaves = Array.from(
  { length: 12 },
  (_, i) =>
    `<ellipse cx="${300 + (i % 4) * 64}" cy="${230 + Math.floor(i / 4) * 66}" rx="55" ry="25" fill="${i % 2 ? "#68834e" : "#3f6544"}" transform="rotate(${i * 33} ${300 + (i % 4) * 64} ${230 + Math.floor(i / 4) * 66})"/>`,
).join("");
const art = {
  "dish-empanada": shell(
    plate +
      '<g fill="#d69b4f" stroke="#a86e31" stroke-width="4"><path d="M240 265Q370 105 500 265Z"/><path d="M320 410Q440 245 565 410Z"/></g><g stroke="#edbd70" stroke-width="5"><path d="M255 257l235 0M338 400h210"/></g><path d="M205 398q25-45 65-20q-10 35-65 20" fill="#547647"/>',
  ),
  "dish-salad": shell(
    plate +
      leaves +
      '<g fill="#c96745" stroke="#f2956f" stroke-width="5"><circle cx="340" cy="265" r="32"/><circle cx="470" cy="325" r="32"/><circle cx="375" cy="390" r="29"/></g><g fill="#e7db91"><circle cx="460" cy="240" r="17"/><circle cx="300" cy="340" r="16"/></g>',
    "#d8dfca",
  ),
  "dish-soup": shell(
    plate +
      '<ellipse cx="400" cy="310" rx="189" ry="158" fill="#b47836"/><ellipse cx="400" cy="310" rx="170" ry="143" fill="#d09a51"/><path d="M290 230l85 15-16 87-81-25Z" fill="#d9bc6b"/><path d="M418 215l60 18 23 98-87-8Z" fill="#e2c778"/><ellipse cx="403" cy="360" rx="65" ry="41" fill="#ad6846"/><path d="M460 350l68 15-20 57-58-15Z" fill="#d97632"/><path d="M330 360q60-72 132-24" fill="none" stroke="#587344" stroke-width="16"/>',
  ),
  "dish-fish": shell(
    plate +
      '<path d="M250 335Q380 155 530 315Q410 443 250 335" fill="#dca866" stroke="#b98547" stroke-width="8"/><path d="M285 325l205-26M315 359l158-25" stroke="#f4d59e" stroke-width="12"/><circle cx="530" cy="215" r="52" fill="#e6c955"/><circle cx="530" cy="215" r="41" fill="#f7e39a"/><path d="M530 176v78m-40-39h80" stroke="#fff2c8" stroke-width="5"/><path d="M480 408q50-80 95-25q-45 52-95 25" fill="#587647"/>',
    "#d5ded6",
  ),
  "dish-lemon": shell(
    '<ellipse cx="400" cy="506" rx="125" ry="25" fill="#b6b69a" opacity=".3"/><path d="M290 120h220l-25 370H315Z" fill="#fff" opacity=".6" stroke="#fff" stroke-width="8"/><path d="M304 240h192l-15 241H320Z" fill="#ebd685"/><path d="M445 75l-40 285" stroke="#526c55" stroke-width="13"/><g fill="#fff" opacity=".5"><rect x="335" y="254" width="55" height="55" rx="8"/><rect x="410" y="305" width="50" height="50" rx="8"/></g><circle cx="306" cy="178" r="65" fill="#f1d164" stroke="#faf0be" stroke-width="8"/><path d="M340 372q45-45 76 0q-30 30-76 0" fill="#668b4e"/>',
    "#e0e5c8",
  ),
  coast: shell(
    '<circle cx="605" cy="130" r="63" fill="#f6d49a"/><path d="M0 285Q250 235 450 280T800 265V600H0" fill="#8aaca4"/><path d="M0 340Q300 280 800 360v240H0" fill="#5c8d89"/><path d="M0 460Q210 330 460 435T800 440v160H0" fill="#e7cf9f"/><path d="M105 365h215v146H105" fill="#f3ead5"/><path d="M70 366l139-116 144 116" fill="#ad6849"/><path d="M160 405h65v106" fill="#54776b"/><path d="M255 399h40v45h-40" fill="#afc5b4"/>',
    "#dbe4de",
  ),
};
Object.entries(art).forEach(([name, svg]) =>
  writeFileSync(`frontend/public/${name}.svg`, svg),
);
writeFileSync(
  "frontend/public/cover.svg",
  shell(
    '<path d="M0 600V405Q140 310 300 450T800 350V600" fill="#bec5a6"/><circle cx="620" cy="165" r="97" fill="#efd5a4"/><g transform="translate(20 -80) rotate(-18 400 300)">' +
      plate +
      '<ellipse cx="400" cy="310" rx="174" ry="135" fill="#cf9556"/><path d="M280 350q140-180 260-10" fill="none" stroke="#ecd2a0" stroke-width="50"/>' +
      leaves +
      '</g><path d="M685 450q-150-80-70-230q120 55 70 230" fill="#547349"/><path d="M678 474l-25-197" stroke="#879464" stroke-width="6"/>',
    "#e9ddc5",
  ),
);
