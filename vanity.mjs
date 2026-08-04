/**
 * VANITY — the Vanity Role-Playing Game, for Foundry VTT (v13/v14).
 *
 * Pool = Attribute + Knack + situation. 5–6 = a Success; fail with two or more 1s
 * and you Stumble, banking a Bane of Karma (Draft 12).
 * One Success succeeds; extras buy damage or Special Attacks. Push once (+1 Bane).
 * No hit points — Grit. Vanity / Karma / Glory drive play.
 */

/* -------------------------------------------- */
/*  Constants                                    */
/* -------------------------------------------- */

import { VANITY_CONDITIONS } from "./conditions.mjs";

const ATTRIBUTES = {
  brawn: { label: "Brawn", desc: "power · toughness · melee" },
  flair: { label: "Flair", desc: "agility · aim · stealth · style" },
  wits:  { label: "Wits",  desc: "mind · senses · arcane magic" },
  poise: { label: "Poise", desc: "nerve · charm · divine magic" }
};

const KNACKS = {
  fight:     { label: "Fight",     attr: "brawn" },
  shoot:     { label: "Shoot",     attr: "flair" },
  athletics: { label: "Athletics", attr: "brawn" },
  stealth:   { label: "Stealth",   attr: "flair" },
  notice:    { label: "Notice",    attr: "wits"  },
  lore:      { label: "Lore",      attr: "wits"  },
  survive:   { label: "Survive",   attr: "wits"  },
  charm:     { label: "Charm",     attr: "poise" },
  command:   { label: "Command",   attr: "poise" }
};

const RANKS = ["—", "Trained", "Expert", "Master"];

const LOCKED_KNACKS = {
  "Martial Prowess": "brawn",
  "Larceny": "flair",
  "Arcana": "wits",
  "Faith": "poise",
  "Wildcraft": "wits"
};

/** Class walls never lift — each class sees only its own Locked Knack. */
const CLASS_LOCKED = {
  warrior: "Martial Prowess",
  rogue: "Larceny",
  ranger: "Wildcraft",
  mage: "Arcana",
  cleric: "Faith"
};

/** Everyone is born armed. */
const UNARMED_STRIKE = {
  name: "Unarmed strike",
  type: "weapon",
  img: "icons/skills/melee/unarmed-punch-fist.webp",
  system: {
    dice: 0,
    hands: 0,
    group: "fight",
    properties: "Always with you · perfect for Subdue",
    cost: "—",
    description: "<p>Fists, knees, forehead, the nearest piece of furniture. +0 dice — the pool is Brawn + Fight, and pride does the rest. Declare <b>Subdue</b> to knock them cold instead of killing.</p>"
  }
};

/** The §11 maneuver menu — costs in net Successes beyond the first. */
const MANEUVERS = [
  { key: "disarm", label: "Disarm", cost: 1, hint: "Target drops a weapon or item.",
    desc: "The target <b>drops a weapon or held item</b> of the attacker's choice. Picking it up again costs them their Move — if nobody kicks it away first." },
  { key: "knockdown", label: "Knock Down", cost: 1, hint: "Prone: −1 die; rising costs their move.",
    desc: "The target is knocked <b>prone</b>: they take <b>−1 die on everything</b>, and rising costs them their Move. <i>Plate negates Knock Down; a Nemesis may spend 1 Resolve to shrug it off.</i>" },
  { key: "driveback", label: "Drive Back", cost: 1, hint: "Shove a pace; break away or reposition.",
    desc: "Shove the target <b>a pace</b> — off the bridge's midpoint, out of the doorway, away from the lever. Also how you break away or reposition without giving ground for free. <i>Reach weapons pay 1 less.</i>" },
  { key: "wound", label: "Wound", cost: 1, hint: "Lingering injury: −1 die to a fitting action until treated.",
    desc: "A <b>lingering injury</b>: −1 die to a fitting kind of action <b>until treated</b> (a slashed sword-arm, a gashed leg, a split brow into their eyes). <i>Mail and plate negate the Wound maneuver.</i>" },
  { key: "feint", label: "Feint", cost: 1, hint: "Your next attack on this foe gets +1 die.",
    desc: "You sell the lie; they buy it. Your <b>next attack against this foe gets +1 die</b>." },
  { key: "gap", label: "Find the Gap", cost: 1, hint: "Your next strike on this foe ignores 2 armour dice.",
    desc: "You've read their guard. Your <b>next strike on this foe ignores 2 armour dice</b> (they always keep their Attribute dice — §11a). Set up the killing blow, or the Sunder." },
  { key: "grapple", label: "Grapple", cost: 1, hint: "Held; they must win a Brawn contest to break free.",
    desc: "The target is <b>held</b> — no moving, no clean swings — until they <b>win a Brawn contest</b> to break free. <i>A Nemesis may spend 1 Resolve to shrug it off.</i>" },
  { key: "called", label: "Called Shot", cost: 1, hint: "Trade damage for a targeted effect — GM adjudicates.",
    desc: "Trade damage for a <b>targeted effect</b>: blind an eye, cripple a leg (halve their move), pin the sleeve to the mast. The GM adjudicates the exact price and result." },
  { key: "environment", label: "Environment", cost: 1, hint: "Spend on the scene — kick the brazier, cut the bridge. GM prices it 1–2.",
    desc: "Spend Successes on <b>the scene itself</b>: kick the brazier into the oil, cut the rope bridge, topple the bookcase, slam the portcullis. The GM sets a fair price (usually 1–2) and narrates the chaos." },
  { key: "sunder", label: "Sunder", cost: 2, hint: "Permanently strip 1 armour die or a shield; the first Sunder dents plate (+2→+1).",
    desc: "<b>Permanently strip 1 armour die or destroy a shield</b> for the rest of the fight. The first Sunder against plate <b>dents it (+2 → +1)</b>. Patience dismantles fortresses." },
  { key: "cleave", label: "Cleave", cost: 2, hint: "Deal your remaining damage to a second adjacent foe.",
    desc: "The blow carries through: deal your <b>remaining damage to a second adjacent foe</b>. Best served from a two-hander in a doorway." },
  { key: "offbalance", label: "Off-Balance", cost: 2, hint: "They reel: −2 dice on their next roll.",
    desc: "The target is reeling: <b>−2 dice on their next roll</b>, attack or defence. They still act — they just act badly. <i>It never skips a turn, which is exactly why it replaced Stagger.</i>" },
  { key: "press", label: "Press", cost: 2, hint: "One extra attack now (at most one extra attack per round).",
    desc: "<b>Make one extra attack immediately.</b> Remember the cap: at most <b>one extra attack per round</b>, however it's paid for (Press or Rapid Shot, not both — §11a)." }
];

/**
 * Spell Effects (§17) — the caster's maneuver menu. Successes past the
 * Threshold buy these as readily as they buy the spell's own scaling line.
 * The `fits` line is guidance for the table, not a hard gate: common sense
 * (§6a) decides whether this spell could plausibly do this thing.
 */
const SPELL_EFFECTS = [
  { key: "ignite", label: "Ignite", cost: 1, hint: "1 Grit at the start of each of their turns until put out.",
    desc: "The target <b>burns</b>: <b>1 Grit at the start of each of their turns</b> until they spend an Action smothering it. <i>Fire, acid, lightning.</i>" },
  { key: "blind", label: "Blind", cost: 1, hint: "−2 dice on anything needing sight, one round.",
    desc: "Light, dust or a flood of dark: <b>−2 dice</b> on anything that needs eyes, until the end of their next turn. <i>Light, illusion, weather.</i>" },
  { key: "snare", label: "Snare", cost: 1, hint: "Held until they win a Brawn contest.",
    desc: "Roots, ice, webbing or grasping shadow — the target is <b>Held</b> until they win a <b>Brawn contest</b> to tear free. <i>Nature, ice, shadow.</i>" },
  { key: "push", label: "Push", cost: 1, hint: "Thrown a pace and knocked prone.",
    desc: "The target is thrown <b>a pace and knocked prone</b> — off the parapet, out of the circle, into the fire you just lit. <i>Force, wind, water.</i>" },
  { key: "silence", label: "Silence", cost: 1, hint: "They cannot cast until their next turn.",
    desc: "No breath, no words, no incantation: the target <b>cannot cast</b> until their next turn. The cleanest answer to an enemy spellcaster. <i>Divine, mind, sound.</i>" },
  { key: "shield", label: "Shield the Ally", cost: 1, hint: "An ally gains +2 defence dice until their next turn.",
    desc: "Spend the power outward instead: an ally gains <b>+2 defence dice</b> until their next turn. <i>Any protective list.</i>" },
  { key: "spread", label: "Spread", cost: 2, hint: "Also strikes one further target within reach.",
    desc: "The magic carries: it also strikes <b>one further target within reach</b> of the first, for your remaining damage. <i>Fire, sound, area.</i>" },
  { key: "linger", label: "Linger", cost: 2, hint: "Lasts a second round — and doesn't strain the Weave for it.",
    desc: "The effect <b>lasts a second round</b> with no second casting — and crucially does <b>not</b> strain the Weave (§17) for it. <i>Wards, clouds, blessings.</i>" },
  { key: "unmake", label: "Unmake", cost: 2, hint: "Strip a ward, blessing, resistance or enchantment.",
    desc: "Strip a <b>magical defence</b>: a ward, a blessing, a resistance, or one enchantment on an object. <i>Arcane, divine.</i>" },
  { key: "mark", label: "Mark of the Divine", cost: 2, hint: "Faith only: allies get +1 die against them all scene.",
    desc: "<b>Faith only.</b> The target is <b>Marked</b>: every ally's attack against them gains <b>+1 die</b> until the scene ends. <i>Divine only.</i>" }
];

/** Which menu a card's spare Successes may be spent from. */
function menuFor(context) { return context === "spell" ? SPELL_EFFECTS : MANEUVERS; }

/**
 * The interactive spend panel for attack cards: click maneuvers to buy them
 * with Successes, dial in the defender's Successes, read off the damage.
 */
function renderSpendPanel({ successes, spend, sublabel, menu = MANEUVERS, context = "attack", threshold = 0 }) {
  const s = { defence: 0, damage: 0, maneuvers: [], ...(spend ?? {}) };
  const net = successes - s.defence;

  const hints = [];
  if (/brutal/i.test(sublabel ?? "")) hints.push("<b>Brutal:</b> a free Wound on this hit.");
  if (/armour-piercing/i.test(sublabel ?? "")) hints.push("<b>Armour-Piercing:</b> 2 of their armour dice never counted.");
  if (/reach/i.test(sublabel ?? "")) hints.push("<b>Reach:</b> Drive Back costs 1 less.");

  const defRow = `
    <div class="spend-def">
      <span class="lbl">Defender's Successes</span>
      <button type="button" class="def-btn" data-def="-1" ${s.defence < 1 ? "disabled" : ""}>−</button>
      <b class="def-n">${s.defence}</b>
      <button type="button" class="def-btn" data-def="1">+</button>
    </div>`;

  if (net <= 0 && context !== "spell") {
    return `<div class="vanity-spend">
      ${defRow}
      <div class="turned">Turned aside — net ${net}, no harm done.</div>
    </div>`;
  }

  const isSpell = context === "spell";
  const budget = isSpell ? Math.max(0, successes - (threshold || 1)) : net - 1;
  const spentOnMans = s.maneuvers.reduce((n, k) => n + (menu.find(m => m.key === k)?.cost ?? 0), 0);
  const remaining = budget - s.damage - spentOnMans;
  const totalDamage = (isSpell ? 0 : 1) + s.damage;

  const manBtns = menu.map(m => {
    const sel = s.maneuvers.includes(m.key);
    const disabled = !sel && remaining < m.cost;
    return `<button type="button" class="spend-btn ${sel ? "sel" : ""}" data-man="${m.key}"
      title="${m.hint}" ${disabled ? "disabled" : ""}>${m.label}<i>${m.cost}</i></button>`;
  }).join("");

  const chosen = s.maneuvers.map(k => menu.find(m => m.key === k)).filter(Boolean);
  const descs = chosen.map(m => `<div class="man-desc">
      <span class="man-name">${m.label}</span><span class="man-cost">${m.cost} Success${m.cost > 1 ? "es" : ""}</span>
      <p>${m.desc}</p>
    </div>`).join("");

  return `<div class="vanity-spend">
    ${isSpell ? "" : defRow}
    <div class="dmg-line">
      <span class="dmg">${isSpell && !s.damage ? "Effects" : `Damage: <b>${totalDamage} Grit</b>`}</span>
      <span class="left">${remaining > 0 ? `${remaining} Success${remaining === 1 ? "" : "es"} to spend` : "all spent"}</span>
    </div>
    <div class="spend-buttons dmg-row">
      <button type="button" class="spend-btn dmg-btn" data-dmg="1" title="Spend a Success on +1 Grit of damage" ${remaining < 1 ? "disabled" : ""}>+1 damage</button>
      <button type="button" class="spend-btn dmg-btn" data-dmg="-1" title="Take back a point of bought damage" ${s.damage < 1 ? "disabled" : ""}>−1 damage</button>
    </div>
    <div class="spend-buttons man-grid">
      ${manBtns}
    </div>
    ${hints.length ? `<div class="prop-hints">${hints.join(" ")}</div>` : ""}
    ${descs}
  </div>`;
}

const SPELL_LISTS = {
  arcane: { label: "Arcane",       attr: "wits",  knack: "Arcana" },
  divine: { label: "Divine",       attr: "poise", knack: "Faith" },
  trick:  { label: "Nature Trick", attr: "wits",  knack: "Wildcraft" }
};

const MISCAST_TABLE = [
  "<b>Backlash</b> — the spell turns on you or your nearest ally at full force.",
  "<b>Wild Surge</b> — all within reach are knocked prone; you are absurdly marked for the scene.",
  "<b>Unwanted Guest</b> — a confused, hostile minor creature appears beside you and acts on the GM's turn.",
  "<b>Aetheric Feedback</b> — lose half your remaining Grit (round up), you are Rattled, Spellcraft −2 dice until you rest.",
  "<b>Smoke &amp; Thunder</b> — a soot-black thunderclap blinds &amp; deafens everyone adjacent (−2 dice) for a round.",
  "<b>Catastrophic Unravelling</b> — a burst strikes friend and foe (area attack at your Successes), +2 Banes, ALL your magic is dead until a full ritual."
];

const NPC_CATEGORIES = {
  mook:     "Mook",
  standard: "Standard foe",
  threat:   "Threat",
  nemesis:  "Nemesis (boss)"
};

/* -------------------------------------------- */
/*  Documents                                    */
/* -------------------------------------------- */

class VanityActor extends Actor {
  prepareDerivedData() {
    super.prepareDerivedData();
    const sys = this.system;

    if (this.type === "character") {
      const grit = sys.grit;
      grit.value = Math.clamp(grit.value ?? 0, 0, grit.max ?? 10);
      sys.vanity = Math.clamp(sys.vanity ?? 0, 0, 6); // an ego can only hold so much (§3)
      // Rattled at half Grit lost (round up): remaining <= floor(max / 2)
      sys.rattled = grit.value > 0 && grit.value <= Math.floor((grit.max ?? 0) / 2);
      sys.takenOut = grit.value <= 0;
      sys.reckoning = (sys.karma ?? 0) >= 6;

      // Defence pools: Attribute + equipped armour + shield
      let armourDice = 0, shieldDice = 0;
      for (const it of this.items) {
        if (it.type !== "armour" || !it.system.equipped) continue;
        if (it.system.kind === "shield") shieldDice += Number(it.system.defence) || 0;
        else armourDice += Number(it.system.defence) || 0;
      }
      sys.armourDice = armourDice;
      sys.shieldDice = shieldDice;
      sys.dodgePool = (sys.attributes.flair.value || 0) + armourDice + shieldDice;
      sys.blockPool = (sys.attributes.brawn.value || 0) + armourDice + shieldDice;
      sys.load = 6 + (sys.attributes.brawn.value || 0);
    }

    if (this.type === "npc") {
      sys.grit.value = Math.clamp(sys.grit.value ?? 0, 0, sys.grit.max ?? 1);
    }
  }

  /** Keep the Locked Knack in step with the class — walls never lift. */
  async _preUpdate(changed, options, user) {
    await super._preUpdate(changed, options, user);
    if (this.type !== "character") return;
    const newClass = foundry.utils.getProperty(changed, "system.details.class");
    if (newClass !== undefined) {
      const lockedName = CLASS_LOCKED[String(newClass).trim().toLowerCase()];
      if (lockedName) {
        foundry.utils.setProperty(changed, "system.locked.name", lockedName);
        foundry.utils.setProperty(changed, "system.locked.attribute", LOCKED_KNACKS[lockedName]);
      }
    }
    const newLocked = foundry.utils.getProperty(changed, "system.locked.name");
    if (newLocked && LOCKED_KNACKS[newLocked]) {
      foundry.utils.setProperty(changed, "system.locked.attribute", LOCKED_KNACKS[newLocked]);
    }
  }

  /** Add banes to the Karma tab (capped at 6, where the Reckoning falls due) and herald it. */
  async addBanes(n, reason = "") {
    if (!n || this.type !== "character") return;
    const karma = Math.min(6, (this.system.karma ?? 0) + n);
    await this.update({ "system.karma": karma });
    if (karma >= 6) {
      ui.notifications?.warn(`${this.name}: ${game.i18n.localize("VANITY.Reckoning")}`);
    }
    await ChatMessage.create({
      speaker: { alias: "The Tab" },
      content: `<div class="vanity-roll vanity-tab-note bane-bank">
        <header><span class="vanity-roll-label">☠ The tab grows</span>
        <span class="vanity-roll-sub">${this.name}${reason ? ` — ${reason}` : ""}</span></header>
        <p><b>+${n} Bane${n > 1 ? "s" : ""}</b> banked · ${this.name} now carries <b>${karma}</b> of 6.${karma >= 6 ? " <b class=\"reck\">THE RECKONING IS DUE.</b>" : ""}</p>
        <div class="vanity-buttons">
          ${karma >= 6
            ? `<button type="button" class="vanity-reckon" data-actor-uuid="${this.uuid}"><i class="fa-solid fa-skull"></i> GM: THE RECKONING — roll 2d6, wipe the tab</button>`
            : `<button type="button" class="vanity-twist" data-actor-uuid="${this.uuid}"><i class="fa-solid fa-dice"></i> GM: Twist the Knife — roll 2d6</button>`}
        </div>
      </div>`
    });
  }
}

class VanityItem extends Item {}

/** The Draw with Momentum: a hero who earned Momentum (a 3+ Success roll) adds dice
 *  to their next initiative and keeps the highest. Consumed as it is rolled. */
class VanityCombatant extends foundry.documents.Combatant {
  _getInitiativeFormula() {
    const m = Math.max(0, Math.floor(this.actor?.system?.momentum ?? 0));
    if (m > 0 && this.actor?.isOwner) this.actor.update({ "system.momentum": 0 }).catch(() => {});
    return m > 0 ? `${1 + m}d6kh1` : (CONFIG.Combat.initiative?.formula || "1d6");
  }
}

/* -------------------------------------------- */
/*  The dice engine                              */
/* -------------------------------------------- */

const DIE_FACES = ["", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];

function faceClass(r) {
  if (r >= 5) return "success";
  if (r === 1) return "bane";
  return "blank";
}

function renderDice(results) {
  return results.map(r => `<span class="vanity-die ${faceClass(r)}" title="${r}">${DIE_FACES[r]}</span>`).join("");
}

/**
 * Build the chat-card HTML for a pool roll.
 */
/** The tab, resolved (Draft 14.1). Two+ fails threaten a Bane regardless of Successes;
 *  a player may burn 1 Success to cancel one fail (drop below two dodges the Bane). A
 *  single remaining fail is the GM's free Twist. `canceled` = fails cancelled so far. */
function baneState(results, canceled = 0) {
  const rawSucc = results.filter(r => r >= 5).length;
  const rawOnes = results.filter(r => r === 1).length;
  const succ = Math.max(0, rawSucc - canceled);
  const ones = Math.max(0, rawOnes - canceled);
  return { rawSucc, rawOnes, canceled, succ, ones,
           threat: ones >= 2, canBurn: ones >= 2 && succ >= 1, singleFail: ones === 1 };
}

function renderRollCard({ label, sublabel, results, threshold, pushed, context, extra, spend, canceled = 0, baneResolved = null, isChar = false, twistUsed = false, spell = null, target = null }) {
  const st = baneState(results, canceled);
  const successes = st.succ;
  const met = threshold ? successes >= threshold : successes >= 1;

  let outcome;
  if (threshold) {
    outcome = met
      ? `<span class="good">The Weave answers — Threshold ${threshold} met</span>`
      : `<span class="bad">Short of Threshold ${threshold}</span>`;
  } else {
    outcome = met
      ? `<span class="good">${successes} ${successes === 1 ? "Success" : "Successes"}</span>`
      : `<span class="bad">Failure</span>`;
  }

  let buttons = "";
  if (!pushed) {
    buttons += `<button type="button" class="vanity-push"><i class="fa-solid fa-fire"></i> Push (+1 Bane)</button>`;
    if (context === "spell" && !met) {
      buttons += `<button type="button" class="vanity-fizzle"><i class="fa-solid fa-wind"></i> Fizzle (spell spent)</button>`;
    }
  }

  const specials = (context === "attack" || context === "spell") && successes >= 1
    ? renderSpendPanel({ successes, spend, sublabel, menu: menuFor(context), context, threshold })
    : "";

  // ── the tab ── 2+ fails threaten a Bane (burn 1 Success to cancel one); a single fail is a free twist.
  const pending = isChar && st.threat && baneResolved !== "banked" && baneResolved !== "cleared";
  let baneUI = "";
  if (isChar && baneResolved === "banked") {
    baneUI = `<div class="vanity-outcome"><span class="banes">· ${st.canceled ? `burned ${st.canceled} Success${st.canceled > 1 ? "es" : ""}, then ` : ""}the tab grows — <b>+1 Bane</b> banked</span></div>`;
  } else if (pending) {
    const burn = st.canBurn
      ? `<button type="button" class="vanity-burn"><i class="fa-solid fa-fire-flame-simple"></i> Burn a Success</button>`
      : "";
    baneUI = `<div class="vanity-bane-choice">
      <span class="warn"><i class="fa-solid fa-triangle-exclamation"></i> <b>${st.ones} fails</b> — the tab threatens a <b>Bane</b>.${st.canBurn ? " Burn a Success to cancel one, or take it." : " No Success to spare — it banks."}</span>
      <div class="vanity-buttons">${burn}<button type="button" class="vanity-takebane"><i class="fa-solid fa-skull"></i> Take the Bane</button></div>
    </div>`;
  } else if (isChar && baneResolved === "cleared") {
    baneUI = `<div class="vanity-outcome"><span class="banes soft">· burned ${st.canceled} Success${st.canceled > 1 ? "es" : ""} — the tab stays clean</span></div>`;
  }
  const freeTwist = isChar && st.singleFail && !twistUsed && !pending && baneResolved !== "banked"
    ? `<div class="vanity-buttons twist-row"><button type="button" class="vanity-twist free" data-free="true"><i class="fa-solid fa-dice"></i> GM: Twist the Knife — free 2d6</button></div>`
    : (twistUsed ? `<div class="twist-spent">The knife has been twisted.</div>` : "");

  const spellBanner = spell ? `
    <div class="vanity-spellcard ${spell.school ?? ""}">
      <img src="${spell.img}" alt="">
      <div class="sc-meta">
        <span class="sc-line">${spell.list} · Threshold ${threshold}${spell.flavor ? ` · <i>${spell.flavor}</i>` : ""}</span>
        <div class="sc-effect">${spell.effect}</div>
      </div>
    </div>` : "";

  const spellScaling = spell && met && successes > (threshold || 1)
    ? `<div class="sc-scaling">✦ <b>${successes - threshold} extra Success${successes - threshold > 1 ? "es" : ""}</b> to spend on the scaling: <i>${spell.scaling}</i></div>`
    : "";

  return `
  <div class="vanity-roll">
    <header>
      <span class="vanity-roll-label">${label}</span>
      ${sublabel ? `<span class="vanity-roll-sub">${sublabel}</span>` : ""}
    </header>
    ${spellBanner}
    <div class="vanity-dice">${renderDice(results)}</div>
    <div class="vanity-outcome">
      ${outcome}
      ${st.ones && !pending && baneResolved !== "banked" && baneResolved !== "cleared"
        ? `<span class="banes soft">· ${st.ones === 1 ? "a lone 1 — a single fail" : `${st.ones} ones`}</span>` : ""}
      ${pushed ? `<span class="pushed">· Pushed</span>` : ""}
    </div>
    ${baneUI}
    ${freeTwist}
    ${spellScaling}
    ${targetBlock(target, results, spend, context, canceled)}
    ${extra ? `<div class="vanity-extra">${extra}</div>` : ""}
    ${specials}
    ${buttons ? `<div class="vanity-buttons">${buttons}</div>` : ""}
  </div>`;
}

/**
 * The exchange, resolved (§10): who was struck at, what their guard rolled,
 * and what is left to land. Damage is applied on a button so the GM stays in
 * charge of the fiction — Subdue, mercy and "he was already down" all live in
 * the beat between the roll and the click.
 */
function targetBlock(target, results, spend, context = "attack", canceled = 0) {
  if (!target) return "";
  const successes = Math.max(0, results.filter(r => r >= 5).length - canceled);
  const net = Math.max(0, successes - (spend?.defence ?? target.successes ?? 0));
  // In an exchange the first net Success IS the hit — 1 Grit before anything is
  // bought. Only a spell starts from nothing, because its Threshold bought the
  // effect instead. Mirrors the arithmetic in renderSpendPanel.
  const damage = net > 0 ? (context === "spell" ? 0 : 1) + (spend?.damage ?? 0) : 0;
  const pips = (target.results ?? []).map(r =>
    `<span class="d ${r >= 5 ? "hit" : r === 1 ? "one" : ""}">${DIE_FACES[r] ?? r}</span>`).join("");
  const pierceNote = target.piercing
    ? (target.pierced
      ? ` · <span class="pierced">armour-piercing — ${target.full}d cut to ${target.pool}d</span>`
      : ` · <span class="pierced">armour-piercing — nothing left to strip</span>`)
    : "";
  return `
  <div class="vanity-target">
    <div class="tgt-head"><i class="fa-solid fa-crosshairs"></i> <b>${target.name}</b>
      <span class="tgt-sub">${target.label} ${target.pool}d${pierceNote}</span></div>
    <div class="tgt-dice">${pips}<span class="tgt-res">${target.successes} Success${target.successes === 1 ? "" : "es"} stopped</span></div>
    <div class="tgt-net">${net > 0
      ? `<b>${net}</b> net Success${net === 1 ? "" : "es"} through — spend ${net === 1 ? "it" : "them"} above`
      : `<b>Turned aside.</b> The guard held.`}</div>
    ${damage > 0
      ? `<div class="vanity-buttons"><button type="button" class="vanity-apply" data-damage="${damage}"><i class="fa-solid fa-heart-crack"></i> Apply ${damage} Grit to ${target.name}</button></div>`
      : ""}
  </div>`;
}

/**
 * Take the damage off the target's Grit and say what it did.
 *
 * Applied once — the button disarms itself afterwards, so a card cannot be
 * clicked twice in the noise of a fight. Emptying Grit announces Taken Out
 * (§5a) but never decides the state: Down, Broken or Dying is the GM's call,
 * and Subdue was declared before the roll.
 */
async function applyDamageToTarget(message, damage) {
  const f = message.flags?.vanity;
  if (!f?.target?.uuid || damage <= 0) return;
  if (f.applied) return ui.notifications.warn("That blow has already been paid for.");

  const actor = await fromUuid(f.target.uuid);
  if (!actor) return ui.notifications.warn("That target is no longer on the board.");

  const grit = actor.system?.grit ?? {};
  const before = Number(grit.value) || 0;
  const after = Math.max(0, before - damage);
  await actor.update({ "system.grit.value": after });

  const takenOut = after === 0 && before > 0;
  await message.update({ "flags.vanity.applied": true });
  await ChatMessage.create({
    speaker: { alias: "The Exchange" },
    content: `<div class="vanity-roll vanity-forge-card">
      <p><b>${f.target.name}</b> takes <b>${damage} Grit</b> — ${before} → <b>${after}</b>.</p>
      ${takenOut ? `<p><b>TAKEN OUT.</b> Down, Broken or Dying is the GM's call (§5a) — and whoever struck the blow chose Subdue or Kill before it landed.</p>` : ""}
    </div>`
  });
}

/**
 * Roll a VANITY pool and post the chat card.
 * options: { threshold, context ("spell"|"attack"|...), spellUuid, sublabel }
 */
/** Stamp the VANITY dice appearance on a roll so it shows the peacock dice regardless
 *  of the player's own Dice So Nice settings (belt-and-suspenders with the roll hook). */
function lockVanityDice(roll, colorset = "vanity") {
  for (const die of roll.dice) die.options.appearance = { system: "vanity", colorset };
  return roll;
}

async function rollPool(actor, pool, label, options = {}) {
  pool = Math.max(1, Math.floor(pool));
  const roll = new Roll(`${pool}d6`);
  await roll.evaluate();
  lockVanityDice(roll);
  const results = roll.dice[0].results.map(r => r.result);

  // Two or more fails threaten a Bane regardless of Successes. If the roller can burn
  // (1 Success cancels one fail) they decide on the card; if not, it banks automatically.
  // A single fail is the GM's free twist, not a Bane.
  const isChar = actor?.type === "character";
  const st = baneState(results, 0);
  let baneResolved = null, autoBank = 0;
  if (isChar && st.threat) {
    if (st.canBurn) baneResolved = null;              // pending — the player chooses
    else { baneResolved = "banked"; autoBank = 1; }   // no Success to burn — it banks
  }

  const flags = {
    vanity: {
      results,
      pool,
      label,
      sublabel: options.sublabel ?? "",
      threshold: options.threshold ?? 0,
      context: options.context ?? "",
      spellUuid: options.spellUuid ?? "",
      actorUuid: actor?.uuid ?? "",
      pushed: false,
      extra: "",
      canceled: 0,
      baneResolved,
      isChar,
      spell: options.spell ?? null,
      target: options.target ?? null,
      spend: options.spend ?? { defence: 0, damage: 0, maneuvers: [] }
    }
  };

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    rolls: [roll],
    sound: CONFIG.sounds.dice,
    content: renderRollCard({
      label, sublabel: options.sublabel, results, threshold: options.threshold, pushed: false,
      context: options.context, canceled: 0, baneResolved, isChar, spell: options.spell ?? null,
      target: options.target ?? null, spend: flags.vanity.spend
    }),
    flags
  });
  if (autoBank) await actor.addBanes(1, `two fails on “${label}”`);

  // Momentum: a roll of 3+ Successes (two beyond the one needed) earns a die on the
  // next Draw. Caps at +2; a fresh grant only heralds when it actually rises.
  if (isChar && st.succ >= 3 && options.context !== "draw") {
    const old = actor.system.momentum ?? 0;
    const m = Math.min(2, old + 1);
    if (m > old) {
      await actor.update({ "system.momentum": m });
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor }),
        content: `<div class="vanity-roll vanity-momentum"><p>✦ <b>Momentum</b> — ${st.succ} Successes. ${actor.name} carries <b>+${m} die</b> on their next Draw (keep highest).</p></div>`
      });
    }
  }
}

/* -------------------------------------------- */
/*  Targeting — the defender answers for itself   */
/* -------------------------------------------- */

/** Does this weapon's properties line claim Armour-Piercing? */
function isPiercing(text) {
  return /armour[-\s]?piercing|armor[-\s]?piercing|\bAP\b/i.test(String(text ?? ""));
}

/**
 * The pool a defender actually rolls.
 *
 * Characters defend with the better of block or dodge — nobody chooses their
 * worse guard. Armour-Piercing strips up to 2 armour dice, but §11a is
 * absolute: Attribute dice always defend, so the pool never falls below the
 * governing Attribute. A nameless foe has no attribute breakdown to protect,
 * so AP simply thins its pool, never below one die.
 */
function defenceProfile(actor, { piercing = false } = {}) {
  const sys = actor.system ?? {};
  if (actor.type !== "character") {
    const pool = Number(sys.defence?.pool) || 0;
    return {
      pool: piercing ? Math.max(1, pool - 2) : pool,
      label: sys.defence?.note?.trim() || "defence", floor: 1, full: pool
    };
  }
  const dodge = Number(sys.dodgePool) || 0;
  const block = Number(sys.blockPool) || 0;
  const useBlock = block >= dodge;
  const attr = Number(useBlock ? sys.attributes?.brawn?.value : sys.attributes?.flair?.value) || 0;
  const full = useBlock ? block : dodge;
  return {
    pool: piercing ? Math.max(attr, full - 2) : full,
    label: useBlock ? "block" : "dodge", floor: attr, full
  };
}

/** Roll a defender's guard and report what it stopped. */
async function rollDefence(actor, { piercing = false } = {}) {
  const prof = defenceProfile(actor, { piercing });
  const roll = new Roll(`${Math.max(1, prof.pool)}d6`);
  await roll.evaluate();
  const results = roll.dice[0].results.map(r => r.result);
  return {
    ...prof, results, roll,
    successes: results.filter(r => r >= 5).length,
    pierced: piercing && prof.pool < prof.full
  };
}

/** The token the attacker has targeted, if exactly one is marked. */
function currentTarget() {
  const t = [...(game.user?.targets ?? [])];
  if (t.length !== 1) return null;
  const token = t[0];
  return token?.actor ? { token, actor: token.actor, name: token.name || token.actor.name } : null;
}

/* -------------------------------------------- */
/*  Straining the Weave (§17) — the spam brake    */
/* -------------------------------------------- */

/**
 * Strain is per scene: cast the same spell again and its Threshold rises by
 * +1 per prior casting, resetting when the scene changes or on a rest.
 *
 * The count lives in a flag stamped with the scene it belongs to, so a change
 * of scene resets it on read — no hook, nothing to miss if a GM swaps scenes
 * mid-fight or reloads.
 */
function strainScene() {
  return game.scenes?.current?.id ?? game.scenes?.viewed?.id ?? "no-scene";
}

/** Prior castings of this spell in the current scene. */
function strainCount(item) {
  const s = item.getFlag("vanity", "strain");
  return s?.scene === strainScene() ? Number(s.casts) || 0 : 0;
}

/** Threshold as it stands now: printed Threshold + 1 per prior casting. */
function effectiveThreshold(item) {
  return (Number(item.system.threshold) || 1) + strainCount(item);
}

/** Remember a casting. Called only once the dice have actually been rolled. */
async function addStrain(item) {
  return item.setFlag("vanity", "strain", { scene: strainScene(), casts: strainCount(item) + 1 });
}

/** Let the Weave settle — clears strain on every spell an actor carries. */
async function clearStrain(actor) {
  const strained = actor.items.filter(i => i.type === "spell" && i.getFlag("vanity", "strain"));
  for (const i of strained) await i.unsetFlag("vanity", "strain");
  return strained.length;
}

/**
 * The pool-builder dialog: situational dice, Vanity spend, Rattled penalty.
 */
async function promptAndRoll(actor, { title, base, baseLabel, options = {} }) {
  const rattled = actor?.system?.rattled ? 1 : 0;
  const vanity = actor?.type === "character" ? (actor.system.vanity ?? 0) : 0;

  const content = `
  <form class="vanity-roll-dialog">
    <p class="pool-line"><b>${baseLabel}</b> — base pool <b>${base}</b>${rattled ? ` · <span class="rattled">Rattled −1</span>` : ""}</p>
    <div class="form-group">
      <label>Situational dice (gear, position, help)</label>
      <input type="number" name="bonus" value="0" step="1">
    </div>
    ${vanity > 0 ? `<div class="form-group">
      <label>Spend 1 Vanity for +1 die <em>(${vanity} left)</em></label>
      <input type="checkbox" name="vanity">
    </div>` : ""}
    ${options.threshold ? `<p class="hint">Spell Threshold ${options.threshold} — meet it and the spell works (and is never spent).</p>` : ""}
  </form>`;

  return new Promise(resolve => {
    new Dialog({
      title,
      content,
      buttons: {
        roll: {
          icon: '<i class="fa-solid fa-dice"></i>',
          label: "Roll",
          callback: async html => {
            const form = html[0].querySelector("form");
            const bonus = parseInt(form.elements.bonus?.value) || 0;
            const spendVanity = form.elements.vanity?.checked ?? false;
            let pool = base + bonus - rattled;
            let sub = [];
            if (bonus) sub.push(`${bonus > 0 ? "+" : ""}${bonus} situation`);
            if (rattled) sub.push("−1 Rattled");
            if (spendVanity) {
              pool += 1;
              sub.push("+1 Vanity");
              await actor.update({ "system.vanity": Math.max(0, vanity - 1) });
            }
            options.sublabel = [options.sublabel, sub.join(" · ")].filter(Boolean).join(" · ");
            await rollPool(actor, pool, title, options);
            resolve(true);
          }
        },
        cancel: { icon: '<i class="fa-solid fa-xmark"></i>', label: "Cancel", callback: () => resolve(false) }
      },
      default: "roll"
    }).render(true);
  });
}

/* ------------ chat-card buttons (Push / Fizzle) ------------ */

async function handlePush(message) {
  const f = message.flags?.vanity;
  if (!f || f.pushed) return;

  const actor = f.actorUuid ? await fromUuid(f.actorUuid) : null;
  const results = [...f.results];
  const keep = results.filter(r => r >= 5);
  const rerollCount = results.length - keep.length;

  let newResults = keep;
  let roll = null;
  if (rerollCount > 0) {
    roll = new Roll(`${rerollCount}d6`);
    await roll.evaluate();
    lockVanityDice(roll);
    newResults = keep.concat(roll.dice[0].results.map(r => r.result));
    if (game.dice3d) await game.dice3d.showForRoll(roll, game.user, true);
  }

  // The Push always bills 1 Bane (chosen hubris). The pushed result's 2+ fails then
  // threaten a further Bane, which the player may burn a Success to dodge on the card.
  const isCharacter = actor?.type === "character";
  const st = baneState(newResults, 0);
  let baneResolved = null, autoBank = 0;
  if (isCharacter && st.threat) {
    if (st.canBurn) baneResolved = null;
    else { baneResolved = "banked"; autoBank = 1; }
  }
  const successes = st.succ;

  let extra = autoBank
    ? `<span class="pushed-note">${game.i18n.localize("VANITY.Pushed")} — and straight into two fails (+2 Banes).</span>`
    : `<span class="pushed-note">${game.i18n.localize("VANITY.Pushed")} (+1 Bane).</span>`;

  // A failed Push on a spell is a CATASTROPHE.
  if (f.context === "spell" && f.threshold && successes < f.threshold) {
    const d = new Roll("1d6");
    await d.evaluate();
    const n = d.total;
    extra += `<div class="vanity-miscast"><b>CATASTROPHE! Miscast (${n}):</b> ${MISCAST_TABLE[n - 1]}</div>`;
    if (f.spellUuid) {
      const spell = await fromUuid(f.spellUuid);
      if (spell) await spell.update({ "system.spent": true });
      extra += `<div class="spent-note">The spell is spent until recovered.</div>`;
    }
  }

  const spend = { defence: f.spend?.defence ?? 0, damage: 0, maneuvers: [] };
  await message.update({
    content: renderRollCard({
      label: f.label, sublabel: f.sublabel, results: newResults,
      threshold: f.threshold, pushed: true, context: f.context, extra, spend,
      canceled: 0, baneResolved, isChar: isCharacter, twistUsed: f.twistUsed ?? false, spell: f.spell ?? null, target: f.target ?? null
    }),
    "flags.vanity.results": newResults,
    "flags.vanity.pushed": true,
    "flags.vanity.extra": extra,
    "flags.vanity.canceled": 0,
    "flags.vanity.baneResolved": baneResolved,
    "flags.vanity.spend": spend
  });
  if (isCharacter) {
    await actor.addBanes(1 + autoBank, autoBank ? `Pushed “${f.label}” into two fails` : `Pushed “${f.label}”`);
  }
}

/** A click on the attack card's spend panel: buy damage or maneuvers, set defence. */
async function handleSpend(message, dataset) {
  const f = message.flags?.vanity;
  if (!f) return;
  const successes = baneState(f.results, f.canceled ?? 0).succ;
  const spend = { defence: 0, damage: 0, maneuvers: [], ...(f.spend ?? {}) };

  if (dataset.def !== undefined) {
    spend.defence = Math.max(0, spend.defence + Number(dataset.def));
  } else if (dataset.dmg !== undefined) {
    spend.damage = Math.max(0, spend.damage + Number(dataset.dmg));
  } else if (dataset.man) {
    if (spend.maneuvers.includes(dataset.man)) spend.maneuvers = spend.maneuvers.filter(k => k !== dataset.man);
    else spend.maneuvers.push(dataset.man);
  }

  // Never overspend: if the budget shrank (defence went up), drop purchases.
  const budget = f.context === "spell"
    ? Math.max(0, successes - (f.threshold || 1))
    : Math.max(0, successes - spend.defence - 1);
  const cost = spend.damage + spend.maneuvers.reduce((n, k) => n + (menuFor(f.context).find(m => m.key === k)?.cost ?? 0), 0);
  if (cost > budget) {
    if (dataset.def !== undefined) { spend.damage = 0; spend.maneuvers = []; }
    else return; // an illegal purchase — ignore the click
  }

  await message.update({
    content: renderRollCard({
      label: f.label, sublabel: f.sublabel, results: f.results,
      threshold: f.threshold, pushed: f.pushed, context: f.context, extra: f.extra, spend, canceled: f.canceled ?? 0, baneResolved: f.baneResolved ?? null, isChar: f.isChar, twistUsed: f.twistUsed ?? false, spell: f.spell ?? null, target: f.target ?? null
    }),
    "flags.vanity.spend": spend
  });
}

/** Burn 1 Success to cancel one fail. Drop below two fails and the Bane is dodged. */
async function handleBurn(message) {
  const f = message.flags?.vanity;
  if (!f || f.baneResolved === "banked" || f.baneResolved === "cleared") return;
  if (!baneState(f.results, f.canceled ?? 0).canBurn) return;
  const canceled = (f.canceled ?? 0) + 1;
  const st = baneState(f.results, canceled);
  const baneResolved = st.threat ? (f.baneResolved ?? null) : "cleared";

  // Fewer Successes may make a prior attack-spend illegal — trim to the new budget.
  const spend = { defence: f.spend?.defence ?? 0, damage: f.spend?.damage ?? 0, maneuvers: [...(f.spend?.maneuvers ?? [])] };
  const budget = f.context === "spell"
    ? Math.max(0, st.succ - (f.threshold || 1))
    : Math.max(0, st.succ - spend.defence - 1);
  const cost = spend.damage + spend.maneuvers.reduce((n, k) => n + (menuFor(f.context).find(m => m.key === k)?.cost ?? 0), 0);
  if (cost > budget) { spend.damage = 0; spend.maneuvers = []; }

  await message.update({
    content: renderRollCard({
      label: f.label, sublabel: f.sublabel, results: f.results, threshold: f.threshold,
      pushed: f.pushed, context: f.context, extra: f.extra, spend,
      canceled, baneResolved, isChar: f.isChar, twistUsed: f.twistUsed ?? false, spell: f.spell ?? null, target: f.target ?? null
    }),
    "flags.vanity.canceled": canceled,
    "flags.vanity.baneResolved": baneResolved,
    "flags.vanity.spend": spend
  });
}

/** Accept the Bane rather than burn Successes: the tab grows by one. */
async function handleTakeBane(message) {
  const f = message.flags?.vanity;
  if (!f || f.baneResolved === "banked" || f.baneResolved === "cleared") return;
  await message.update({
    content: renderRollCard({
      label: f.label, sublabel: f.sublabel, results: f.results, threshold: f.threshold,
      pushed: f.pushed, context: f.context, extra: f.extra, spend: f.spend,
      canceled: f.canceled ?? 0, baneResolved: "banked", isChar: f.isChar, twistUsed: f.twistUsed ?? false, spell: f.spell ?? null, target: f.target ?? null
    }),
    "flags.vanity.baneResolved": "banked"
  });
  const actor = f.actorUuid ? await fromUuid(f.actorUuid) : null;
  if (actor?.type === "character") await actor.addBanes(1, `two fails on “${f.label}”`);
}

async function handleFizzle(message) {
  const f = message.flags?.vanity;
  if (!f || f.pushed) return;
  let extra = `<div class="spent-note">The spell fizzles and is <b>spent</b> until recovered (rest or ritual).</div>`;
  if (f.spellUuid) {
    const spell = await fromUuid(f.spellUuid);
    if (spell) await spell.update({ "system.spent": true });
  }
  await message.update({
    content: renderRollCard({
      label: f.label, sublabel: f.sublabel, results: f.results,
      threshold: f.threshold, pushed: true, context: f.context, extra, canceled: f.canceled ?? 0, baneResolved: f.baneResolved ?? null, isChar: f.isChar, twistUsed: f.twistUsed ?? false, spell: f.spell ?? null, target: f.target ?? null
    }),
    "flags.vanity.pushed": true,
    "flags.vanity.extra": extra
  });
}

/* -------------------------------------------- */
/*  Actor sheets                                 */
/* -------------------------------------------- */

class VanityActorSheet extends foundry.appv1.sheets.ActorSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["vanity", "sheet", "actor"],
      template: "systems/vanity/templates/character-sheet.hbs",
      width: 780,
      height: 900,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "main" }]
    });
  }

  async getData(options) {
    const ctx = await super.getData(options);
    const sys = this.actor.system;
    ctx.sys = sys;
    ctx.attributes = Object.entries(ATTRIBUTES).map(([key, a]) => ({
      key, label: a.label, desc: a.desc, value: sys.attributes[key].value
    }));
    ctx.knacks = Object.entries(KNACKS).map(([key, k]) => ({
      key, label: k.label, attr: k.attr, attrLabel: ATTRIBUTES[k.attr].label,
      rank: sys.knacks[key].rank, rankLabel: RANKS[sys.knacks[key].rank],
      pool: (sys.attributes[k.attr].value || 0) + (sys.knacks[key].rank || 0)
    }));
    ctx.lockedAttrs = Object.keys(ATTRIBUTES);
    // A recognised class sees only its own Locked Knack; walls never lift.
    const classLocked = CLASS_LOCKED[(sys.details.class || "").trim().toLowerCase()];
    ctx.lockedNames = classLocked
      ? [...new Set([classLocked, sys.locked.name].filter(Boolean))]
      : Object.keys(LOCKED_KNACKS);
    ctx.lockedPool = (sys.attributes[sys.locked.attribute]?.value || 0) + (Number(sys.locked.rank) || 0);
    ctx.rankOptions = RANKS;

    ctx.gritCells = Array.fromRange(sys.grit.max ?? 10, 1).map(i => ({
      i, filled: i <= sys.grit.value, half: i === Math.floor((sys.grit.max ?? 10) / 2)
    }));
    ctx.vanityPips = Array.fromRange(6, 1).map(i => ({ i, filled: i <= (sys.vanity ?? 0) }));
    ctx.karmaPips = Array.fromRange(6, 1).map(i => ({ i, filled: i <= (sys.karma ?? 0) }));

    const items = this.actor.items;
    ctx.weapons = items.filter(i => i.type === "weapon");
    ctx.armour = items.filter(i => i.type === "armour");
    ctx.gear = items.filter(i => i.type === "gear");
    ctx.spells = items.filter(i => i.type === "spell").map(s => ({
      item: s, listLabel: SPELL_LISTS[s.system.list]?.label ?? s.system.list,
      strain: strainCount(s), threshold: effectiveThreshold(s)
    }));
    ctx.strained = ctx.spells.some(s => s.strain > 0);
    // The Animal Companion is the Ranger's, via Wildcraft (§7). Other classes
    // never see the card — but if one already has a bonded beast (an edge, a
    // gift, a GM's ruling), it stays on the sheet rather than vanishing.
    const bond = this.actor.system.companion ?? {};
    ctx.hasCompanion = String(this.actor.system.details?.class ?? "").trim().toLowerCase() === "ranger"
      || Boolean(String(bond.name ?? "").trim() || String(bond.kind ?? "").trim());
    ctx.edges = items.filter(i => i.type === "edge");
    ctx.vices = items.filter(i => i.type === "vice");
    ctx.hasSpells = ctx.spells.length > 0;
    ctx.slotsUsed = ctx.gear.reduce((n, g) => n + (Number(g.system.slots) || 0) * (Number(g.system.quantity) || 1), 0)
      + ctx.weapons.length + ctx.armour.filter(a => a.system.kind !== "shield" || a.system.equipped).length;

    const active = this.actor.statuses ?? new Set();
    const withImg = c => ({ ...c, img: `systems/vanity/assets/conditions/${c.id}.png` });
    const groups = { combat: "In the fray", spell: "Sorcery", state: "The big states" };
    ctx.conditions = VANITY_CONDITIONS.map(c => ({ ...withImg(c), active: active.has(c.id) }));
    ctx.conditionGroups = Object.entries(groups).map(([g, label]) => ({
      group: g, label,
      items: ctx.conditions.filter(c => c.group === g)
    }));
    ctx.activeConditions = ctx.conditions.filter(c => c.active);
    const cmp = this.actor.system.companion;
    ctx.companionDowned = !!cmp?.name && (cmp.grit?.value ?? 3) <= 0;
    ctx.focusCond = this._focusCond
      ? ctx.conditions.find(c => c.id === this._focusCond) ?? null
      : null;

    ctx.notesHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(sys.notes ?? "", { async: true });
    ctx.bioHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(sys.biography ?? "", { async: true });
    ctx.editable = this.isEditable;
    return ctx;
  }

  activateListeners(html) {
    super.activateListeners(html);
    if (!this.isEditable) return;
    const actor = this.actor;

    // Attribute roll
    html.find(".attr .num, .attr .nm").click(ev => {
      const key = ev.currentTarget.closest("[data-attr]").dataset.attr;
      const a = ATTRIBUTES[key];
      promptAndRoll(actor, {
        title: `${a.label} check`,
        base: actor.system.attributes[key].value || 0,
        baseLabel: a.label
      });
    });

    // Saving throw (right-click an attribute)
    html.find(".attr").contextmenu(ev => {
      ev.preventDefault();
      const key = ev.currentTarget.dataset.attr;
      const a = ATTRIBUTES[key];
      promptAndRoll(actor, {
        title: `Saving Throw — ${a.label}`,
        base: actor.system.attributes[key].value || 0,
        baseLabel: `${a.label} save (1 Success = you save)`
      });
    });

    // Knack roll
    html.find(".knack-row .kn").click(ev => {
      const key = ev.currentTarget.closest("[data-knack]").dataset.knack;
      const k = KNACKS[key];
      const pool = (actor.system.attributes[k.attr].value || 0) + (actor.system.knacks[key].rank || 0);
      promptAndRoll(actor, {
        title: `${k.label}`,
        base: pool,
        baseLabel: `${ATTRIBUTES[k.attr].label} + ${k.label} (${RANKS[actor.system.knacks[key].rank]})`
      });
    });

    // Locked knack roll
    html.find(".locked-roll").click(() => {
      const l = actor.system.locked;
      if (!l.name) return ui.notifications.warn("Set the Locked Knack name first.");
      const rank = Number(l.rank) || 0;
      const pool = (actor.system.attributes[l.attribute]?.value || 0) + rank;
      promptAndRoll(actor, {
        title: l.name,
        base: pool,
        baseLabel: `${ATTRIBUTES[l.attribute].label} + ${l.name} (${RANKS[rank]})`
      });
    });

    // Knack rank stepper (click cycles 0→1→2, right-click reverses)
    html.find(".knack-row .rank").click(async ev => {
      const key = ev.currentTarget.closest("[data-knack]").dataset.knack;
      const r = actor.system.knacks[key].rank;
      await actor.update({ [`system.knacks.${key}.rank`]: (r + 1) % 3 });
    }).contextmenu(async ev => {
      ev.preventDefault();
      const key = ev.currentTarget.closest("[data-knack]").dataset.knack;
      const r = actor.system.knacks[key].rank;
      await actor.update({ [`system.knacks.${key}.rank`]: (r + 2) % 3 });
    });

    // Grit track
    html.find(".grit-cell").click(async ev => {
      const i = Number(ev.currentTarget.dataset.i);
      const cur = actor.system.grit.value;
      await actor.update({ "system.grit.value": i === cur ? i - 1 : i });
    });

    // Vanity / Karma pips
    html.find(".pip-btn").click(async ev => {
      const { res, i } = ev.currentTarget.dataset;
      const cur = actor.system[res] ?? 0;
      const n = Number(i);
      await actor.update({ [`system.${res}`]: n === cur ? n - 1 : n });
    });

    // Defence quick rolls
    html.find(".roll-dodge").click(() => promptAndRoll(actor, {
      title: "Dodge", base: actor.system.dodgePool,
      baseLabel: `Flair ${actor.system.attributes.flair.value} + armour ${actor.system.armourDice} + shield ${actor.system.shieldDice}`
    }));
    html.find(".roll-block").click(() => promptAndRoll(actor, {
      title: "Block", base: actor.system.blockPool,
      baseLabel: `Brawn ${actor.system.attributes.brawn.value} + armour ${actor.system.armourDice} + shield ${actor.system.shieldDice}`
    }));

    // Initiative
    html.find(".roll-draw").click(async () => {
      if (actor.inCombat) {
        const c = game.combat?.combatants.find(c => c.actorId === actor.id);
        if (c) return game.combat.rollInitiative([c.id]);   // VanityCombatant folds in Momentum
      }
      // Out of combat: 1d6 + any Momentum dice, keep the highest; consume the Momentum.
      const m = Math.max(0, Math.floor(actor.system.momentum ?? 0));
      const roll = new Roll(`${1 + m}d6kh1`);
      await roll.evaluate();
      lockVanityDice(roll);
      if (m) await actor.update({ "system.momentum": 0 });
      await roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor }),
        flavor: `The Draw (initiative)${m ? ` — +${m} Momentum` : ""} · act highest to lowest`
      });
    });

    // Weapon attack
    html.find(".item-attack").click(async ev => {
      const item = actor.items.get(ev.currentTarget.closest("[data-item-id]").dataset.itemId);
      if (!item) return;
      const group = item.system.group === "shoot" ? "shoot" : "fight";
      const attrKey = KNACKS[group].attr;
      const attr = actor.system.attributes[attrKey].value || 0;
      let knackDice = actor.system.knacks[group].rank || 0;
      let knackName = KNACKS[group].label;
      // Martial Prowess is the Warrior's fighting knack when set
      const locked = actor.system.locked;
      if (group === "fight" && locked.name === "Martial Prowess") {
        knackDice = Math.max(knackDice, Number(locked.rank) || 0);
        knackName = "Martial Prowess";
      }
      // If exactly one token is targeted, the defender answers for itself: its
      // guard is rolled here and the result is dialled into the card, so the
      // exchange (§10) resolves in one step instead of two.
      const mark = currentTarget();
      const piercing = isPiercing(item.system.properties);
      const defence = mark ? await rollDefence(mark.actor, { piercing }) : null;

      await promptAndRoll(actor, {
        title: `${item.name} — attack`,
        base: attr + knackDice + (Number(item.system.dice) || 0),
        baseLabel: `${ATTRIBUTES[attrKey].label} ${attr} + ${knackName} ${knackDice} + weapon ${item.system.dice}`,
        options: {
          context: "attack", sublabel: item.system.properties,
          target: mark && defence ? {
            uuid: mark.actor.uuid, name: mark.name, piercing,
            label: defence.label, pool: defence.pool, full: defence.full,
            pierced: defence.pierced, results: defence.results, successes: defence.successes
          } : null,
          spend: mark && defence ? { defence: defence.successes, damage: 0, maneuvers: [] } : undefined
        }
      });
    });

    // Spell cast
    html.find(".item-cast").click(async ev => {
      const item = actor.items.get(ev.currentTarget.closest("[data-item-id]").dataset.itemId);
      if (!item) return;
      if (item.system.spent) return ui.notifications.warn(`${item.name} is spent — recover it with a rest or ritual.`);
      const listDef = SPELL_LISTS[item.system.list] ?? SPELL_LISTS.arcane;
      const attr = actor.system.attributes[listDef.attr].value || 0;
      const locked = actor.system.locked;
      const knackDice = Number(locked.rank) || 0;
      const flavor = (item.system.description ?? "").match(/<i>(.*?)<\/i>/)?.[1] ?? "";
      const prior = strainCount(item);
      const threshold = effectiveThreshold(item);
      const rolled = await promptAndRoll(actor, {
        title: `Cast ${item.name}`,
        base: attr + knackDice,
        baseLabel: `${ATTRIBUTES[listDef.attr].label} ${attr} + ${locked.name || listDef.knack} ${knackDice} · Threshold ${threshold}`
          + (prior ? ` <span class="strained">(the Weave strains — +${prior})</span>` : ""),
        options: {
          context: "spell",
          threshold,
          spellUuid: item.uuid,
          spell: {
            img: item.img,
            list: listDef.label,
            school: item.system.list,
            effect: item.system.effect,
            scaling: item.system.scaling,
            flavor
          }
        }
      });
      // Only a casting that actually reached the dice strains the Weave —
      // a cancelled dialog costs nothing.
      if (rolled) await addStrain(item);
    });

    // Let the Weave settle — clear this scene's strain (§17)
    html.find(".strain-reset").click(async () => {
      const n = await clearStrain(actor);
      if (!n) return ui.notifications.info(`The Weave is already quiet around ${actor.name}.`);
      ui.notifications.info(`The Weave settles — strain cleared on ${n} spell${n > 1 ? "s" : ""}.`);
    });

    // Spell recover / spend toggle
    html.find(".item-spent").click(async ev => {
      const item = actor.items.get(ev.currentTarget.closest("[data-item-id]").dataset.itemId);
      if (item) await item.update({ "system.spent": !item.system.spent });
    });

    // Armour equip toggle
    html.find(".item-equip").click(async ev => {
      const item = actor.items.get(ev.currentTarget.closest("[data-item-id]").dataset.itemId);
      if (item) await item.update({ "system.equipped": !item.system.equipped });
    });

    // Item management
    html.find(".item-edit").click(ev => {
      const item = actor.items.get(ev.currentTarget.closest("[data-item-id]").dataset.itemId);
      item?.sheet.render(true);
    });
    html.find(".item-delete").click(async ev => {
      const item = actor.items.get(ev.currentTarget.closest("[data-item-id]").dataset.itemId);
      if (item) await item.delete();
    });
    html.find(".item-create").click(async ev => {
      const type = ev.currentTarget.dataset.type;
      await actor.createEmbeddedDocuments("Item", [{ name: `New ${type}`, type }]);
    });

    // Breather: catch your breath in a quiet scene → +2 Grit (§5)
    html.find(".rest-breather").click(async () => {
      const g = actor.system.grit;
      if (g.value >= g.max) return ui.notifications.info(`${actor.name} is already at full Grit.`);
      await actor.update({ "system.grit.value": Math.min(g.max, g.value + 2) });
      const settled = await clearStrain(actor);
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor }),
        content: `<div class="vanity-roll vanity-forge-card"><p><b>${actor.name}</b> catches their breath — <b>+2 Grit</b> (${actor.system.grit.value}/${g.max})${settled ? `, and <b>the Weave settles</b>` : ""}.</p></div>`
      });
    });

    // Proper rest: all Grit, clear 1 Bane, recover spent spells (§5, §17)
    html.find(".rest-full").click(async () => {
      const g = actor.system.grit;
      const karma = Math.max(0, (actor.system.karma ?? 0) - 1);
      await actor.update({ "system.grit.value": g.max, "system.karma": karma });
      const spent = actor.items.filter(i => i.type === "spell" && i.system.spent);
      if (spent.length) await actor.updateEmbeddedDocuments("Item", spent.map(i => ({ _id: i.id, "system.spent": false })));
      const settled = await clearStrain(actor);
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor }),
        content: `<div class="vanity-roll vanity-forge-card"><p><b>${actor.name}</b> takes a proper rest: <b>Grit restored</b> (${g.max}/${g.max}), <b>1 Bane cleared</b> (tab ${karma})${spent.length ? `, <b>${spent.length} spell${spent.length > 1 ? "s" : ""} recovered</b>` : ""}${settled ? `, <b>the Weave settled</b>` : ""}.</p></div>`
      });
    });

    // Refuse to Fall: 1 Vanity → stop at 1 Grit, +2 Banes (§5)
    html.find(".refuse-fall").click(async () => {
      if ((actor.system.vanity ?? 0) < 1) return ui.notifications.warn("Refusing to Fall costs 1 Vanity — the purse is empty.");
      await actor.update({ "system.vanity": actor.system.vanity - 1, "system.grit.value": 1 });
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor }),
        content: `<div class="vanity-roll vanity-forge-card"><p><b>${actor.name} REFUSES TO FALL</b> — still standing at <b>1 Grit</b>, one more beat. Fate notices.</p></div>`
      });
      await actor.addBanes(2, "Refused to Fall — cheating fate");
    });

    // Play the Vice: +1 Vanity now, the GM banks a Bane for later (§8a)
    html.find(".vice-play").click(async ev => {
      const item = actor.items.get(ev.currentTarget.closest("[data-item-id]").dataset.itemId);
      if (!item) return;
      await actor.update({ "system.vanity": Math.min(6, (actor.system.vanity ?? 0) + 1) });
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor }),
        content: `<div class="vanity-roll vanity-forge-card"><p><b>${actor.name}</b> plays their Vice — <b>${item.name}</b> <i>(${item.system.trigger})</i>. <b>+1 Vanity</b> now (${actor.system.vanity}); the bill arrives later.</p></div>`
      });
      await actor.addBanes(1, `played their Vice — ${item.name}`);
    });

    // Conditions: click a badge to toggle the status (actor + tokens) and read it below
    html.find(".cond-badge").click(async ev => {
      const id = ev.currentTarget.dataset.cond;
      this._focusCond = id;
      await actor.toggleStatusEffect(id);
      this.render(false);
    });
    // Click a name in the details panel to read it without toggling
    html.find(".cond-read").click(ev => {
      this._focusCond = ev.currentTarget.dataset.cond;
      this.render(false);
    });

    // Companion — attack / dodge
    html.find(".cmp-roll").click(ev => {
      const c = actor.system.companion ?? {};
      const name = c.name || "The companion";
      if (ev.currentTarget.dataset.roll === "dodge") {
        return promptAndRoll(actor, { title: `${name} — dodges`, base: c.dodge || 3,
          baseLabel: `Companion dodge ${c.dodge || 3}` });
      }
      return promptAndRoll(actor, { title: `${name} — attacks`, base: c.pool || 3,
        baseLabel: `Companion pool ${c.pool || 3}`, options: { context: "attack" } });
    });

    // Companion — Help · Harry · Guard (one action a round)
    html.find(".cmp-act").click(async ev => {
      const c = actor.system.companion ?? {};
      const name = c.name || "The companion";
      const kind = c.kind ? ` the ${c.kind}` : "";
      const ACTS = {
        help: ["Help", "+1 die",
          `${name}${kind} flanks, flushes or calls the shot — <b>${actor.name} gains +1 die</b> on their next roll this round.`],
        harry: ["Harry", "−1 die",
          `${name}${kind} worries the foe — that foe takes <b>−1 die</b>, and ${actor.name} may treat it as <b>flanked</b> for Ambush-style shots.`],
        guard: ["Guard", "reaction",
          `${name}${kind} throws itself in the way — it <b>intercepts one hit</b> meant for ${actor.name}. That is the companion's reaction this round.`],
      };
      const [label, tag, text] = ACTS[ev.currentTarget.dataset.act] ?? [];
      if (!label) return;
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor }),
        content: `<div class="vanity-roll vanity-companion-card">
          <header><span class="vanity-roll-label">🐾 ${label} — ${tag}</span>
          <span class="vanity-roll-sub">${name}${kind} · the companion's action this round</span></header>
          <p>${text}</p>
          ${c.trick ? `<p class="cmp-trick"><b>Trick:</b> ${c.trick}</p>` : ""}
        </div>`
      });
    });

    // Companion — roll the Bond (d10) and bind the beast to the sheet
    html.find(".cmp-bond").click(async () => {
      const table = await getVanityTable(BOND_TABLE_NAME);
      if (!table) return ui.notifications.error(`"${BOND_TABLE_NAME}" not found in world or compendium.`);
      const roll = new Roll("1d10");
      await roll.evaluate();
      lockVanityDice(roll);
      if (game.dice3d) await game.dice3d.showForRoll(roll, game.user, true).catch(() => {});
      const results = table.getResultsForRoll(roll.total);
      await table.toMessage(results, { roll });

      // Bind it: pull the matching beast from the companions compendium.
      const kind = (results?.[0]?.name ?? "").split("—")[0].trim();
      const beast = (await packDocs("companions")).find(d => d.name === `${kind} (companion)`);
      if (!beast) return;
      await actor.update({
        "system.companion.kind": kind.toLowerCase(),
        "system.companion.img": beast.img,
        "system.companion.pool": beast.system.attack1?.pool ?? 3,
        "system.companion.dodge": beast.system.defence?.pool ?? 3,
        "system.companion.trick": beast.system.trick ?? "",
        "system.companion.grit.value": beast.system.grit?.max ?? 3,
        "system.companion.grit.max": beast.system.grit?.max ?? 3,
      });
      ui.notifications.info(`The Bond: a ${kind.toLowerCase()}. Name it — the table will be shouting that name soon enough.`);
    });
  }
}

class VanityNpcSheet extends foundry.appv1.sheets.ActorSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["vanity", "sheet", "actor", "npc"],
      template: "systems/vanity/templates/npc-sheet.hbs",
      width: 520,
      height: 560
    });
  }

  async getData(options) {
    const ctx = await super.getData(options);
    ctx.sys = this.actor.system;
    ctx.categories = NPC_CATEGORIES;
    ctx.isNemesis = this.actor.system.category === "nemesis";
    ctx.notesHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(this.actor.system.notes ?? "", { async: true });
    ctx.editable = this.isEditable;
    return ctx;
  }

  activateListeners(html) {
    super.activateListeners(html);
    if (!this.isEditable) return;
    const actor = this.actor;
    const sys = actor.system;

    html.find(".npc-roll").click(ev => {
      const which = ev.currentTarget.dataset.roll;
      if (which === "attack1") return promptAndRoll(actor, { title: `${actor.name} — ${sys.attack1.name || "Attack"}`, base: sys.attack1.pool || 1, baseLabel: sys.attack1.note || "attack pool", options: { context: "attack", sublabel: sys.attack1.note } });
      if (which === "attack2") return promptAndRoll(actor, { title: `${actor.name} — ${sys.attack2.name || "Attack"}`, base: sys.attack2.pool || 1, baseLabel: sys.attack2.note || "attack pool", options: { context: "attack", sublabel: sys.attack2.note } });
      if (which === "defence") return promptAndRoll(actor, { title: `${actor.name} — defends`, base: sys.defence.pool || 1, baseLabel: sys.defence.note || "defence pool" });
      if (which === "morale") return promptAndRoll(actor, { title: `${actor.name} — Morale`, base: sys.nerve || 2, baseLabel: "Nerve pool · 1 Success = they hold, 0 = they break" });
      if (which === "reaction") return promptAndRoll(actor, { title: `${actor.name} — Reaction (§24)`, base: 2, baseLabel: "2 dice ± approach (add a PC's Charm Successes) · 0 Hostile · 1 Wary · 2 Neutral · 3+ Friendly" });
    });
  }
}

/* -------------------------------------------- */
/*  Item sheet                                   */
/* -------------------------------------------- */

class VanityItemSheet extends foundry.appv1.sheets.ItemSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["vanity", "sheet", "item"],
      template: "systems/vanity/templates/item-sheet.hbs",
      width: 480,
      height: 420
    });
  }

  async getData(options) {
    const ctx = await super.getData(options);
    ctx.sys = this.item.system;
    ctx.spellLists = SPELL_LISTS;
    ctx.descriptionHTML = await foundry.applications.ux.TextEditor.implementation.enrichHTML(this.item.system.description ?? "", { async: true });
    ctx.editable = this.isEditable;
    return ctx;
  }
}

/* -------------------------------------------- */
/*  Dice So Nice — the peacock dice, enforced    */
/* -------------------------------------------- */

Hooks.once("diceSoNiceReady", dice3d => {
  // "force" locks the VANITY dice system (the custom plume/crown/Bane faces) on for
  // every player, overriding whatever dice they picked personally.
  dice3d.addSystem({ id: "vanity", name: "VANITY — Peacock & Gold" }, "force");

  dice3d.addColorset({
    name: "vanity",
    description: "VANITY — Peacock & Gold",
    category: "VANITY",
    foreground: "#e0c98a",
    background: "#14544e",
    outline: "#0e3f3a",
    edge: "#b0872f",
    material: "metal",
    font: "Cinzel",
    visibility: "visible"
  }, "preferred");

  // 5–6 wear the plume and the crown (Successes); 1 wears the Bane diamond.
  dice3d.addDicePreset({
    type: "d6",
    labels: [
      "systems/vanity/assets/dice/face1-bane.png",
      "2", "3", "4",
      "systems/vanity/assets/dice/face5-plume.png",
      "systems/vanity/assets/dice/face6-crown.png"
    ],
    system: "vanity",
    colorset: "vanity"
  });

  // The Bane dice — blood-red, rolled only when the GM twists the knife.
  dice3d.addColorset({
    name: "vanity-bane",
    description: "VANITY — The Tab (Bane dice)",
    category: "VANITY",
    foreground: "#f2e2b3",
    background: "#8a1f1f",
    outline: "#3d0d0d",
    edge: "#e0c98a",
    material: "metal",
    font: "Cinzel",
    visibility: "visible"
  }, "default");
});

// Lock the VANITY colours onto every die of every roll, whatever the player's own
// Dice So Nice settings. Fires for pool rolls, Pushes, initiative and manual rolls
// alike. Dice already flagged as the blood-red Bane set are left untouched.
Hooks.on("diceSoNiceRollStart", (messageId, context) => {
  const roll = context?.roll;
  if (!roll?.dice) return;
  for (const die of roll.dice) {
    if (die.options?.appearance?.colorset === "vanity-bane") continue;
    die.options.appearance = { system: "vanity", colorset: "vanity" };
  }
});

/* -------------------------------------------- */
/*  Twist the Knife — the GM spends the tab      */
/* -------------------------------------------- */

const TWIST_TABLE_NAME = "Twist the Knife — a single fail (2d6)";
const RECKONING_TABLE_NAME = "THE RECKONING — the tab reads six (2d6)";
const BOND_TABLE_NAME = "The Bond — Animal Companions (d10)";

async function getVanityTable(name) {
  let table = game.tables.getName(name);
  if (!table) {
    const pack = game.packs.get("vanity.tables");
    if (pack) table = (await pack.getDocuments()).find(d => d.name === name);
  }
  return table;
}

/** Roll dice on the playing surface in the blood-red Bane set, without ever blocking. */
async function showBaneDice(roll) {
  for (const d of roll.dice) d.options.appearance = { system: "vanity", colorset: "vanity-bane" };
  if (game.dice3d && !game.settings.get("dice-so-nice", "animateRollTable")) {
    await Promise.race([
      game.dice3d.showForRoll(roll, game.user, true).catch(() => {}),
      new Promise(res => setTimeout(res, 3500))
    ]);
  }
}

/**
 * GM-only: the tab reads six — cash it. Rolls 2d6 on THE RECKONING with the
 * red Bane dice, posts the result, and wipes the character's track to 0.
 */
async function reckoningNow({ actorUuid = "" } = {}) {
  if (!game.user.isGM) return ui.notifications.warn("Only the GM may call the Reckoning.");
  const table = await getVanityTable(RECKONING_TABLE_NAME);
  if (!table) return ui.notifications.error(`"${RECKONING_TABLE_NAME}" not found in world or compendium.`);

  const roll = new Roll("2d6");
  await roll.evaluate();
  await showBaneDice(roll);
  // Foundry's table.draw({roll}) re-rolls internally — map our roll to its result so
  // the red dice on the table and the posted card always agree.
  const results = table.getResultsForRoll(roll.total);
  await table.toMessage(results, { roll });
  const draw = { roll, results };

  if (actorUuid) {
    const actor = await fromUuid(actorUuid);
    if (actor?.type === "character") {
      await actor.update({ "system.karma": 0 });
      await ChatMessage.create({
        speaker: { alias: "The Tab" },
        content: `<div class="vanity-roll vanity-tab-note"><p><b>The tab is cashed in full.</b> ${actor.name}'s track is wiped to <b>0</b>. The universe starts a fresh page.</p></div>`
      });
    }
  }
  return draw;
}

/**
 * GM-only: roll the d66 on Twist the Knife with the blood-red Bane dice.
 * The twist is the Bane's BITE, not its price — it never reduces the tab. A banked
 * Bane stays put (building toward the Reckoning) and only clears through humility,
 * a rest, or the Reckoning at six. A free twist (lone unbanked 1) burns its button.
 */
async function twistTheKnife({ actorUuid = "", free = false, sourceMessage = null } = {}) {
  if (!game.user.isGM) return ui.notifications.warn("Only the GM may twist the knife.");
  const table = await getVanityTable(TWIST_TABLE_NAME);
  if (!table) return ui.notifications.error(`"${TWIST_TABLE_NAME}" not found in world or compendium.`);

  const roll = new Roll("2d6");
  await roll.evaluate();
  await showBaneDice(roll);
  // table.draw({roll}) re-rolls internally — map our roll to its result so the red dice
  // and the posted card agree.
  const results = table.getResultsForRoll(roll.total);
  await table.toMessage(results, { roll });
  const draw = { roll, results };

  // The twist bites, but the tab holds — a banked Bane is never spent by twisting.
  if (!free && actorUuid) {
    const actor = await fromUuid(actorUuid);
    if (actor?.type === "character") {
      const karma = actor.system.karma ?? 0;
      await ChatMessage.create({
        speaker: { alias: "The Tab" },
        content: `<div class="vanity-roll vanity-tab-note"><p>The knife twists — but the Bane stays banked. ${actor.name}'s tab still reads <b>${karma}</b> of 6.</p></div>`
      });
    }
  }

  if (free && sourceMessage?.flags?.vanity) {
    const f = sourceMessage.flags.vanity;
    await sourceMessage.update({
      "flags.vanity.twistUsed": true,
      content: renderRollCard({
        label: f.label, sublabel: f.sublabel, results: f.results, threshold: f.threshold,
        pushed: f.pushed, context: f.context, extra: f.extra, spend: f.spend,
        canceled: f.canceled ?? 0, baneResolved: f.baneResolved ?? null, isChar: f.isChar, twistUsed: true, spell: f.spell ?? null, target: f.target ?? null
      })
    });
  }
  return draw;
}

/* -------------------------------------------- */
/*  THE FORGE — generators                       */
/* -------------------------------------------- */

const rnd = arr => arr[Math.floor(Math.random() * arr.length)];
const rollDice = (n, sides) => Array.from({ length: n }, () => Math.ceil(Math.random() * sides));
const sum = a => a.reduce((x, y) => x + y, 0);

const FORGE_NAMES = {
  given: ["Aldous", "Brannoc", "Caswen", "Darrow", "Elsbeth", "Fenna", "Garrick", "Hesper", "Isolde", "Jorun",
    "Kestrel", "Lirael", "Maera", "Nolwen", "Osric", "Petra", "Quill", "Rosamund", "Sable", "Tamsin",
    "Ulric", "Vesna", "Wren", "Yorick", "Zinnia", "Bram", "Corvin", "Yrsa", "Pinch", "Lark"],
  epithets: ["the Magnificent", "the Unbowed", "of the Gilded Hand", "the Peacock", "Thrice-Crowned",
    "the Modest (a lie)", "of Nine Sorrows", "the Radiant", "Silver-Tongue", "the Immaculate",
    "of the Long Shadow", "the Splendid", "Half-Famous", "the Well-Dressed", "of No Small Talent"],
  surnames: ["Ashveil", "Blackbriar", "Copperfield", "Duskwither", "Emberly", "Fairweather", "Goldhollow",
    "Harrowgate", "Ironquill", "Larkspur", "Mistvale", "Nightingale", "Oakmantle", "Pridewell",
    "Quicksilver", "Ravencourt", "Silverstitch", "Thornbury", "Vainglory", "Winterbourne"]
};

/* ------------ class definitions for the hero forge ------------ */

const FORGE_CLASSES = {
  Warrior: {
    key: "brawn", base: 8, locked: { name: "Martial Prowess", attribute: "brawn" },
    spread: { brawn: 3, flair: 2, wits: 2, poise: 2 },
    knacks: { fight: 2, athletics: 1, command: 1 },
    style: "Sword & Shield",
    gear: ["Long sword", "Mail", "Shield", "Healer's kit"],
    edges: ["Second Wind", "Press the Attack", "Weapon Master", "Measure the Foe / Presence of a Killer / Sunder the Way"],
    concepts: ["The one who steps into the doorway", "A disgraced knight with excellent posture", "Sell-sword between better wars", "Shield-bearer of a broken oath"]
  },
  Rogue: {
    key: "flair", base: 5, locked: { name: "Larceny", attribute: "flair" },
    spread: { brawn: 2, flair: 4, wits: 2, poise: 1 },
    knacks: { stealth: 2, notice: 1, shoot: 1, charm: 1 },
    style: "Two-Weapon",
    gear: ["Short sword", "Short sword", "Padded / Leather", "Thieves' tools", "Blade poison", "Smoke bomb"],
    edges: ["Ambush", "Deadly Precision (Backstab)", "Evasion (Uncanny Dodge)", "Cunning Action", "Poisoner", "Slip Away", "Audacity"],
    concepts: ["Guttersnipe with a professional's contempt for doors", "Retired cat-burglar (twice)", "A spy between employers", "Tomb-robber with impeccable manners"]
  },
  Ranger: {
    key: "flair", base: 6, locked: { name: "Wildcraft", attribute: "wits" },
    spread: { brawn: 2, flair: 3, wits: 2, poise: 2 },
    knacks: { shoot: 2, survive: 1, notice: 1 },
    style: "Ranged",
    gear: ["Long bow", "Dagger", "Dagger", "Padded / Leather", "Hunter's kit"],
    edges: ["Favoured Quarry", "Favoured Enemy", "Rapid Shot", "Animal Companion", "Skirmisher's Step", "Trackless Pathfinder"],
    tricks: 3,
    companions: [["Ash", "hawk"], ["Bracken", "hound"], ["Sorrel", "wolf"], ["Moth", "lynx"], ["Tatters", "raven"]],
    concepts: ["Borderer who guards where the map goes blank", "Beast-friend, people-sceptic", "A vengeful hunter with one name left", "Warden of a forest that remembers"]
  },
  Mage: {
    key: "wits", base: 2, locked: { name: "Arcana", attribute: "wits" },
    spread: { brawn: 1, flair: 2, wits: 4, poise: 2 },
    knacks: { lore: 1, notice: 1 },
    style: "—",
    gear: ["Quarterstaff", "Arcane focus / spellbook"],
    edges: ["Arcane Might", "Free-flowing Power", "Reflexive Ward"],
    spells: { list: "arcane", always: ["Firebolt"], t1: 2, t2: 1, t3: 1 },
    concepts: ["The most dangerous thing in the room, briefly", "Scholar of what could be made so", "Expelled for being right", "Tower-trained, world-curious"]
  },
  Cleric: {
    key: "poise", base: 6, locked: { name: "Faith", attribute: "poise" },
    spread: { brawn: 2, flair: 2, wits: 1, poise: 4 },
    knacks: { command: 1, fight: 1 },
    style: "Sword & Shield",
    gear: ["Mace", "Mail", "Shield", "Holy symbol"],
    edges: ["Aegis of Faith", "Sacred Wrath", "The Creed"],
    spells: { list: "divine", always: ["Mend", "Bless"], t1: 2, t2: 1, t3: 1 },
    creeds: ["protect the helpless", "speak only truth", "leave no debt unpaid", "bury the dead properly", "never refuse hospitality", "humble the proud"],
    concepts: ["The reason the hand still lives to strike again", "Conviction wearing mail", "A creed with legs", "Doubt's least favourite argument"]
  }
};

async function packDocs(packName) {
  const pack = game.packs.get(`vanity.${packName}`);
  return pack ? await pack.getDocuments() : [];
}

function pickN(arr, n) {
  const pool = [...arr];
  const out = [];
  while (n-- > 0 && pool.length) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  return out;
}

/* ------------ Forge a Hero ------------ */

async function forgeHero({ name = "", className = "", wild = false } = {}) {
  const cls = FORGE_CLASSES[className] ? className : rnd(Object.keys(FORGE_CLASSES));
  const def = FORGE_CLASSES[cls];
  name ||= `${rnd(FORGE_NAMES.given)} ${Math.random() < 0.5 ? rnd(FORGE_NAMES.surnames) : rnd(FORGE_NAMES.epithets)}`;

  // Attributes — 9 points, each 1–4, key stat 3+
  let attrs;
  if (wild) {
    attrs = { brawn: 1, flair: 1, wits: 1, poise: 1 };
    attrs[def.key] = 3;
    let left = 9 - 6;
    while (left > 0) {
      const k = rnd(Object.keys(attrs));
      if (attrs[k] < 4) { attrs[k] += 1; left -= 1; }
    }
  } else {
    attrs = { ...def.spread };
  }

  // Grit roll: 2d6, +1 per 5–6, cap 10
  const gritDice = rollDice(2, 6);
  const gritBonus = gritDice.filter(d => d >= 5).length;
  const grit = Math.min(10, def.base + gritBonus);

  // Knacks: class list + one free Common at Trained
  const knacks = Object.fromEntries(Object.keys(KNACKS).map(k => [k, { rank: def.knacks[k] ?? 0 }]));
  const untrained = Object.keys(KNACKS).filter(k => !knacks[k].rank);
  const freeKnack = rnd(untrained);
  knacks[freeKnack].rank = 1;

  // Items from the compendia
  const [weapons, armour, gear, spells, edges, vices] = await Promise.all(
    ["weapons", "armour", "gear", "spells", "edges", "vices"].map(packDocs));
  const byName = new Map([...weapons, ...armour, ...gear, ...spells, ...edges, ...vices].map(d => [d.name, d]));

  const items = [];
  for (const n of def.gear) { const d = byName.get(n); if (d) items.push(d.toObject()); }
  for (const n of def.edges) { const d = byName.get(n); if (d) items.push(d.toObject()); }

  let spellNames = [];
  if (def.spells) {
    const list = spells.filter(s => s.system.list === def.spells.list && !def.spells.always.includes(s.name));
    spellNames = [...def.spells.always,
      ...pickN(list.filter(s => s.system.threshold === 1), def.spells.t1).map(s => s.name),
      ...pickN(list.filter(s => s.system.threshold === 2), def.spells.t2).map(s => s.name),
      ...pickN(list.filter(s => s.system.threshold === 3), def.spells.t3).map(s => s.name)];
  }
  if (def.tricks) {
    const tricks = spells.filter(s => s.system.list === "trick");
    spellNames = ["Nature's Balm", ...pickN(tricks.filter(t => t.name !== "Nature's Balm"), def.tricks - 1).map(t => t.name)];
  }
  for (const n of spellNames) { const d = byName.get(n); if (d) items.push(d.toObject()); }

  const vice = rnd(vices);
  items.push(vice.toObject());

  const companion = def.companions ? rnd(def.companions) : null;
  const creed = def.creeds ? rnd(def.creeds) : null;

  const actor = await Actor.create({
    name, type: "character", img: "icons/svg/mystery-man.svg",
    system: {
      attributes: Object.fromEntries(Object.entries(attrs).map(([k, v]) => [k, { value: v }])),
      grit: { value: grit, max: grit },
      vanity: 3, karma: 0, glory: 0,
      knacks,
      locked: { ...def.locked, rank: 1 },
      details: {
        class: cls, concept: rnd(def.concepts), fightingStyle: def.style,
        coin: { gp: Math.floor(Math.random() * 4), sp: Math.floor(Math.random() * 10), cp: 0 }
      },
      companion: companion
        ? { name: `${companion[0]} (${companion[1]})`, grit: { value: 3, max: 3 }, pool: 3, notes: "Help +1 die · Harry −1 die/flank · Guard (reaction)" }
        : { name: "", grit: { value: 3, max: 3 }, pool: 3, notes: "" },
      notes: creed ? `Creed: ${creed}.` : ""
    },
    items
  });

  await ChatMessage.create({
    speaker: { alias: "The Forge" },
    whisper: ChatMessage.getWhisperRecipients("GM"),
    content: `<div class="vanity-roll vanity-forge-card">
      <header><span class="vanity-roll-label">⚒ A hero steps forward</span>
      <span class="vanity-roll-sub">${cls} · grit roll ${gritDice.join(", ")} → Grit ${grit}</span></header>
      <p><b>@UUID[${actor.uuid}]{${name}}</b> — ${actor.system.details.concept}.</p>
      <p>Brawn ${attrs.brawn} · Flair ${attrs.flair} · Wits ${attrs.wits} · Poise ${attrs.poise}
      · free Knack: <b>${KNACKS[freeKnack].label}</b> · Vice: <b>${vice.name}</b>${companion ? ` · companion <b>${companion[0]} the ${companion[1]}</b>` : ""}${creed ? ` · creed: <i>${creed}</i>` : ""}</p>
    </div>`
  });
  return actor;
}

/* ------------ Forge a Monster ------------ */

const FORGE_MONSTERS = {
  beast: {
    syll: ["Gnar", "Fang", "Rav", "Ur", "Skoll", "Bray", "Mor", "Hulk"],
    tail: ["claw", "maw", "hide", "howl", "tusk", "pelt"],
    icons: ["icons/creatures/mammals/wolf-shadow-black.webp", "icons/creatures/mammals/beast-horned-scaled-glowing-orange.webp", "icons/creatures/abilities/mouth-teeth-rows-red.webp"],
    nerve: 3,
    tricks: ["Knock Down for free on a hit.", "Pounce: +2 dice against anyone who moved this round.", "Savage: +1 die while Rattled.", "Gore: a hit can Drive Back + Knock Down.", "Scent: cannot be ambushed."]
  },
  humanoid: {
    syll: ["Karg", "Vex", "Brann", "Skarn", "Mol", "Dreg", "Hark", "Tuss"],
    tail: ["the Knife", "One-Eye", "the Lesser", "Ironjaw", "the Bought", "Halfhand"],
    icons: ["icons/skills/melee/hand-grip-sword-red.webp", "icons/equipment/head/helm-barbute-brown-tan.webp", "icons/creatures/mammals/humanoid-fox-cat-archer.webp", "icons/creatures/mammals/humanoid-cat-skulking-teal.webp"],
    nerve: 2,
    tricks: ["Pack tactics: +1 die when flanking.", "Disciplined: shares Guard with an adjacent ally.", "Flees when the leader falls.", "Shield-wall: +1 defence die while adjacent to an ally.", "Dirty fighter: a hit can Disarm for free."]
  },
  undead: {
    syll: ["Mort", "Grave", "Dur", "Vess", "Carn", "Hollow", "Pall", "Wight"],
    tail: ["born", "bound", "risen", "of the Barrow", "the Unfed", "of Nine Sorrows"],
    icons: ["icons/magic/death/undead-skeleton-fire-green.webp", "icons/magic/death/undead-ghost-strike-white.webp", "icons/magic/death/skull-energy-light-purple.webp", "icons/magic/death/hand-undead-skeleton-fire-pink.webp"],
    nerve: 5,
    tricks: ["Fearless; fights to destruction.", "Paralysing touch: on a hit, a free Called Shot freezes the victim a round.", "Drains 1 max Grit on a hit.", "Half harm from arrows (bones).", "Rises again next round unless the blow was declared final."]
  },
  fiend: {
    syll: ["Baal", "Zar", "Malg", "Xul", "Vor", "Asha", "Krezz", "Nix"],
    tail: ["of the Pit", "the Tempter", "Oathbreaker", "the Bargain", "Smoke-born"],
    icons: ["icons/magic/unholy/hand-claw-fire-blue.webp", "icons/magic/death/skull-horned-goat-pentagram-red.webp", "icons/magic/unholy/hand-claw-fog-green.webp"],
    nerve: 4,
    tricks: ["Attacks ignore 1 armour die (hellfire claws).", "Offers a bargain mid-fight — accepting is a Vice trigger.", "Immune to fire; doused by holy water.", "Terror: first sight forces a Poise save or −1 die this scene."]
  },
  giant: {
    syll: ["Gor", "Thrum", "Bolg", "Hrun", "Mag", "Ymir", "Krag"],
    tail: ["the Mountain", "Stonefist", "the Hungry", "Skullkeeper"],
    icons: ["icons/creatures/magical/humanoid-giant-forest-blue.webp"],
    nerve: 3,
    tricks: ["A hit can Drive Back + Knock Down.", "Sweep: Cleave costs 1 less Success.", "Hurls boulders: Shoot-range attack at full pool.", "Regenerates 2 Grit a round unless the wound was fire or acid."]
  },
  dragonkin: {
    syll: ["Vyr", "Ssath", "Drak", "Kessa", "Ryx", "Onyx", "Cindra"],
    tail: ["the Gilded", "Ember-Tongue", "of the High Ledge", "Scale-Proud"],
    icons: ["icons/creatures/abilities/dragon-fire-breath-orange.webp", "icons/creatures/abilities/dragon-ice-breath-blue.webp", "icons/creatures/abilities/dragon-breath-purple.webp"],
    nerve: 5,
    tricks: ["Breath: area attack, ignores armour, once every other round.", "Plate-like scales: block +1 die.", "Vain as any king — flattery buys a round of talk (and a Vice trigger).", "Takes wing at half Grit."]
  },
  vermin: {
    syll: ["Skit", "Chit", "Gnash", "Squirm", "Blight", "Scur"],
    tail: ["swarm", "brood", "tide", "nest-mother"],
    icons: ["icons/creatures/mammals/rodent-rat-green.webp", "icons/creatures/mammals/bat-giant-tattered-purple.webp", "icons/creatures/mammals/rodent-rat-diseaed-gray.webp"],
    nerve: 2,
    tricks: ["Swarms; hard to hit with single blows.", "Venomous: a hit adds a free Wound.", "Skitters through any gap; ignores difficult ground.", "Gnaws gear: on a Bane spent, ruins one mundane item."]
  },
  aberration: {
    syll: ["Xoth", "Ylg", "Quor", "Nhal", "Vhu", "Zsske"],
    tail: ["the Unshaped", "of the Deep Dark", "Which Watches", "the Wrong Angle"],
    icons: ["icons/creatures/eyes/eye-ringed-glow-angry-large-teal.webp", "icons/magic/perception/eye-ringed-glow-angry-large-red.webp"],
    nerve: 5,
    tricks: ["Wits save on first sight or lose your action gazing.", "Incorporeal: only magic or blessed weapons bite.", "Reads intentions: cannot be Feinted; ambushes cost +1 Success.", "Its wounds whisper — each hit on it gives the striker 1 Bane."]
  }
};

const MENACE = {
  mook:     { label: "Mook",     atk: [2, 3],  def: [2, 2], grit: [1, 2],   resolve: 0 },
  standard: { label: "Standard", atk: [4, 5],  def: [3, 5], grit: [4, 6],   resolve: 0 },
  threat:   { label: "Threat",   atk: [5, 6],  def: [3, 4], grit: [10, 12], resolve: 0 },
  nemesis:  { label: "Nemesis",  atk: [6, 7],  def: [4, 6], grit: [12, 16], resolve: 3 }
};

const between = ([a, b]) => a + Math.floor(Math.random() * (b - a + 1));

async function forgeMonster({ type = "", menace = "", name = "", silent = false, folderId = null } = {}) {
  const t = FORGE_MONSTERS[type] ? type : rnd(Object.keys(FORGE_MONSTERS));
  const m = MENACE[menace] ? menace : rnd(["mook", "standard", "standard", "threat", "nemesis"]);
  const def = FORGE_MONSTERS[t];
  const tier = MENACE[m];

  if (!name) {
    const base = `${rnd(def.syll)}${rnd(def.syll).toLowerCase()}`;
    const tail = rnd(def.tail);
    // suffix-style tails glue on ("Morthollow-born"); title-style tails stand apart
    name = /^(the |of |[A-Z])/.test(tail) ? `${base} ${tail}` : `${base} ${tail.charAt(0).toUpperCase()}${tail.slice(1)}`;
  }
  const trick = rnd(def.tricks);
  const grit = between(tier.grit);

  const actor = await Actor.create({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    type: "npc",
    folder: folderId,
    img: rnd(def.icons),
    system: {
      category: m,
      attack1: { name: "Attack", pool: between(tier.atk), note: "" },
      attack2: m === "nemesis" ? { name: "Second act", pool: between(tier.atk), note: "second action each round" } : { name: "", pool: 0, note: "" },
      defence: { pool: between(tier.def), note: "" },
      grit: { value: grit, max: grit },
      resolve: { value: tier.resolve, max: tier.resolve },
      nerve: def.nerve,
      trick,
      notes: m === "nemesis" ? `${tier.label} ${t}. Two actions/round · cap single hits at 4 · PHASE at half Grit (${Math.floor(grit / 2)}): change tactics, telegraphed a round ahead.` : `${tier.label} ${t}.`
    }
  });

  if (!silent) await ChatMessage.create({
    speaker: { alias: "The Forge" },
    whisper: ChatMessage.getWhisperRecipients("GM"),
    content: `<div class="vanity-roll vanity-forge-card">
      <header><span class="vanity-roll-label">⚒ Something stirs</span>
      <span class="vanity-roll-sub">${tier.label} ${t}</span></header>
      <p><b>@UUID[${actor.uuid}]{${actor.name}}</b> — attack ${actor.system.attack1.pool}d · defence ${actor.system.defence.pool}d · Grit ${grit}${tier.resolve ? ` · Resolve ${tier.resolve}` : ""} · Nerve ${def.nerve}</p>
      <p><i>${trick}</i></p>
    </div>`
  });
  return actor;
}

/* ------------ Forge a Face (NPC) ------------ */

const FORGE_FACES = {
  occupations: ["innkeeper", "grave-digger", "town watch sergeant", "moneylender", "chandler", "midwife", "rat-catcher",
    "wandering friar", "silk merchant", "blacksmith", "herbalist", "ferryman", "scribe", "fence", "minstrel",
    "beggar-king", "tax collector", "horse trader", "washerwoman who knows everything", "retired sell-sword",
    "apprentice mage (expelled)", "priest of a very small god", "gong farmer", "portrait painter"],
  quirks: ["never says a name twice", "collects buttons from the dead", "laughs at the wrong moments", "immaculately dressed, always",
    "keeps a peacock on a leash", "speaks of themselves in the third person", "quotes their late mother constantly",
    "wildly superstitious about crows", "owes everyone a small favour", "smells faintly of church incense",
    "writes everything down in a little book", "chews fennel seeds", "won't cross running water", "flinches at bells",
    "is missing the same finger on both hands", "claims to have met a king once", "always eating an apple", "hums when lying"],
  wants: ["coin, quickly and quietly", "a letter delivered unopened", "revenge dressed as justice", "to be admired by the right people",
    "out of a bad bargain", "a missing sibling found", "protection from someone dangerous", "a secret kept buried",
    "to leave this town forever", "an heirloom recovered", "someone else blamed", "a rival humiliated in public",
    "a debt forgiven", "one night of real importance"],
  secrets: ["informs for the town watch", "is not who the gravestone says they are", "hides a fugitive in the cellar",
    "owes the moneylender ruinously", "saw what came out of the barrow", "is gently, hopelessly cursed",
    "sells to both sides", "was beautiful once and never recovered", "keeps a stolen holy relic under the floor",
    "poisoned a spouse (allegedly)", "is the by-blow of minor nobility", "belongs to a very quiet cult"],
  icons: ["icons/skills/social/diplomacy-handshake-yellow.webp", "icons/skills/social/diplomacy-handshake-blue.webp",
    "icons/sundries/documents/document-sealed-brown-red.webp", "icons/tools/hand/hammer-and-nail.webp"]
};

async function forgeFace({ name = "", silent = false, folderId = null } = {}) {
  name ||= `${rnd(FORGE_NAMES.given)} ${rnd(FORGE_NAMES.surnames)}`;
  const occupation = rnd(FORGE_FACES.occupations);
  const quirk = rnd(FORGE_FACES.quirks);
  const want = rnd(FORGE_FACES.wants);
  const secret = rnd(FORGE_FACES.secrets);

  // Reaction roll — 2 dice, 5–6 = Success (§24)
  const reactionDice = rollDice(2, 6);
  const rs = reactionDice.filter(d => d >= 5).length;
  const mood = ["Hostile", "Wary", "Neutral", "Friendly"][Math.min(rs, 3)];

  const grit = 1 + Math.floor(Math.random() * 2);
  const actor = await Actor.create({
    name, type: "npc", folder: folderId, img: rnd(FORGE_FACES.icons),
    system: {
      category: "mook",
      attack1: { name: "Scuffle", pool: 2, note: "civilian" },
      attack2: { name: "", pool: 0, note: "" },
      defence: { pool: 2, note: "dodge" },
      grit: { value: grit, max: grit },
      resolve: { value: 0, max: 0 },
      nerve: 2,
      trick: `Quirk: ${quirk}.`,
      notes: `${occupation.charAt(0).toUpperCase() + occupation.slice(1)}. First reaction: ${mood}.\nWants: ${want}.\nSecret: ${secret}.`
    }
  });

  if (!silent) await ChatMessage.create({
    speaker: { alias: "The Forge" },
    whisper: ChatMessage.getWhisperRecipients("GM"),
    content: `<div class="vanity-roll vanity-forge-card">
      <header><span class="vanity-roll-label">⚒ A face in the crowd</span>
      <span class="vanity-roll-sub">reaction ${reactionDice.join(", ")} → <b>${mood}</b></span></header>
      <p><b>@UUID[${actor.uuid}]{${name}}</b>, ${occupation} — ${quirk}.</p>
      <p>Wants <i>${want}</i>. Secret: <i>${secret}</i></p>
    </div>`
  });
  return actor;
}

/* ------------ Forge a Hoard (treasure) ------------ */

const FORGE_TRINKETS = [
  ["A silver hand-mirror that always flatters", 8],
  ["A peacock-plume brooch, eye still watching", 5],
  ["A gilded death mask of a forgotten magistrate", 12],
  ["Opera gloves embroidered with someone else's initials", 3],
  ["A ring of braided hair under glass", 4],
  ["A tiny portrait locket — the face has been scratched out", 6],
  ["A crystal decanter that rings a perfect A when struck", 9],
  ["Ivory dice, subtly loaded toward sixes", 7],
  ["A signet ring for a house that no longer exists", 10],
  ["A vial of perfume that smells like rain on stone", 5],
  ["A silk banner from a tournament nobody admits losing", 6],
  ["A jewelled shoe buckle (just the one)", 4],
  ["A love letter, sealed, addressed only to 'You'", 2],
  ["An enamelled snuffbox with a hidden second lid", 8],
  ["A saint's fingerbone in a gold reliquary (provenance dubious)", 15],
  ["A courtier's fan painted with a scandalous scene", 7],
  ["A chess queen carved from jet, warm to the touch", 9],
  ["Spectacles that make everything look slightly grander", 11]
];

const FORGE_CENTERPIECES = [
  ["A life-size gilt statue of its previous owner, mid-flourish", 60],
  ["A peacock throne in miniature — a chair for a cat, solid silver", 45],
  ["A chandelier of stag horn and rock crystal", 50],
  ["A full-length mirror in a frame of golden laurels", 40],
  ["A tapestry of a battle that never happened, victors clearly labelled", 35],
  ["A jewelled crown sized for a child king", 80]
];

const FORGE_HOOKS = [
  "Someone knows exactly what was in here, and will notice.",
  "One coin in the pile is minted with next year's date.",
  "The previous owner's rival would pay double to hear of this.",
  "It is all subtly monogrammed. Fencing it will take a professional.",
  "A beggar watched them carry it in, years ago. He remembers.",
  "The centerpiece is famous. Displaying it is a Vice trigger.",
  "A tithe is owed on it to a temple that keeps excellent records.",
  "It's cursed, mildly: the owner dreams of its old master weekly."
];

const HOARDS = {
  pocket: { label: "Pocket",  coin: () => `${sum(rollDice(2, 6))} sp`,            draws: 0, consum: 0.3, trinkets: [0, 1], hook: 0.15, relics: 0 },
  cache:  { label: "Cache",   coin: () => `${sum(rollDice(1, 6))} gp, ${sum(rollDice(2, 6))} sp`, draws: 1, consum: 0.8, trinkets: [0, 1], hook: 0.3, relics: 0.2 },
  chest:  { label: "Chest",   coin: () => `${sum(rollDice(4, 6))} gp`,            draws: 2, consum: 1, trinkets: [1, 1], hook: 0.5, relics: 0.5 },
  vault:  { label: "Vault",   coin: () => `${sum(rollDice(2, 6)) * 10} gp`,       draws: 3, consum: 1, trinkets: [1, 2], hook: 1, relics: 1 },
  kingly: { label: "Kingly",  coin: () => `${sum(rollDice(6, 6)) * 10} gp`,       draws: 5, consum: 1, trinkets: [2, 2], hook: 1, centerpiece: true, relics: 2 }
};

/**
 * Forge a hoard.
 * @param {string}  size  pocket | cache | chest | vault | kingly
 * @param {boolean} post  post the GM card. false lets a caller own the presentation.
 * @returns {{size, label, coin, goods, relics, trinkets, centerpiece, hook, lines, card}}
 */
async function forgeHoard({ size = "chest", post = true } = {}) {
  const tier = HOARDS[size] ?? HOARDS.chest;
  const [weapons, armour, gear, treasure] = await Promise.all(["weapons", "armour", "gear", "treasure"].map(packDocs));
  const consumables = gear.filter(g => g.system.consumable);
  const mundane = [...weapons, ...armour, ...gear.filter(g => !g.system.consumable)];

  const lines = [];
  lines.push(`<b>Coin:</b> ${tier.coin()}`);

  const found = [];
  // rnd() returns undefined on an empty array; a pack with no consumables would then throw on
  // .uuid below. Guard rather than assume every pack is populated.
  if (Math.random() < tier.consum && consumables.length) found.push(rnd(consumables));
  for (let i = 0; i < tier.draws; i++) if (mundane.length) found.push(rnd(mundane));
  if (found.length) lines.push(`<b>Goods:</b> ${found.map(d => `@UUID[${d.uuid}]{${d.name}}`).join(" · ")}`);

  // A magic relic or two in the richer hoards (a fraction is a chance, an integer a count).
  const nRelics = (tier.relics ?? 0) >= 1 ? tier.relics : (Math.random() < (tier.relics ?? 0) ? 1 : 0);
  let relics = [];
  if (nRelics && treasure.length) {
    relics = pickN(treasure, Math.min(nRelics, treasure.length));
    lines.push(`<b>Relic${relics.length > 1 ? "s" : ""}:</b> ${relics.map(d => `@UUID[${d.uuid}]{${d.name}}`).join(" · ")}`);
  }

  const nTr = between(tier.trinkets);
  if (nTr) lines.push(`<b>Vanities:</b> ${pickN(FORGE_TRINKETS, nTr).map(([t, v]) => `${t} <i>(${v} gp)</i>`).join(" · ")}`);

  if (tier.centerpiece) {
    const [c, v] = rnd(FORGE_CENTERPIECES);
    lines.push(`<b>Centerpiece:</b> ${c} <i>(${v} gp — displayed during a carouse, it counts double toward Glory)</i>`);
  }
  if (Math.random() < tier.hook) lines.push(`<b>The catch:</b> <i>${rnd(FORGE_HOOKS)}</i>`);

  const card = `<div class="vanity-roll vanity-forge-card">
      <header><span class="vanity-roll-label">⚒ ${tier.label} hoard</span>
      <span class="vanity-roll-sub">gold you cling to buys nothing — gold you squander buys legend (§27)</span></header>
      ${lines.map(l => `<p>${l}</p>`).join("")}
    </div>`;

  if (post) await ChatMessage.create({
    speaker: { alias: "The Forge" },
    whisper: ChatMessage.getWhisperRecipients("GM"),
    content: card
  });

  return { size, label: tier.label, goods: found, relics, lines, card };
}

/* ------------ Forge dialogs & directory buttons ------------ */

function forgeHeroDialog() {
  new Dialog({
    title: "The Forge — a Hero",
    content: `<form class="vanity-roll-dialog">
      <div class="form-group"><label>Name (blank = fate decides)</label><input type="text" name="name"></div>
      <div class="form-group"><label>Class</label><select name="cls">
        <option value="">Random</option>
        ${Object.keys(FORGE_CLASSES).map(c => `<option value="${c}">${c}</option>`).join("")}
      </select></div>
      <div class="form-group"><label>Wild attribute spread (random, key stat 3+)</label><input type="checkbox" name="wild"></div>
    </form>`,
    buttons: {
      forge: {
        icon: '<i class="fa-solid fa-hammer"></i>', label: "Forge",
        callback: html => {
          const f = html[0].querySelector("form");
          forgeHero({ name: f.elements.name.value.trim(), className: f.elements.cls.value, wild: f.elements.wild.checked });
        }
      }
    },
    default: "forge"
  }).render(true);
}

function forgeMonsterDialog() {
  new Dialog({
    title: "The Forge — a Monster",
    content: `<form class="vanity-roll-dialog">
      <div class="form-group"><label>Name (blank = fate decides)</label><input type="text" name="name"></div>
      <div class="form-group"><label>Kind</label><select name="type">
        <option value="">Random</option>
        ${Object.keys(FORGE_MONSTERS).map(t => `<option value="${t}">${t}</option>`).join("")}
      </select></div>
      <div class="form-group"><label>Menace</label><select name="menace">
        <option value="">Random</option>
        ${Object.entries(MENACE).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join("")}
      </select></div>
    </form>`,
    buttons: {
      forge: {
        icon: '<i class="fa-solid fa-hammer"></i>', label: "Forge",
        callback: html => {
          const f = html[0].querySelector("form");
          forgeMonster({ name: f.elements.name.value.trim(), type: f.elements.type.value, menace: f.elements.menace.value });
        }
      }
    },
    default: "forge"
  }).render(true);
}

function forgeHoardDialog() {
  new Dialog({
    title: "The Forge — a Hoard",
    content: `<form class="vanity-roll-dialog">
      <div class="form-group"><label>How big?</label><select name="size">
        ${Object.entries(HOARDS).map(([k, v]) => `<option value="${k}" ${k === "chest" ? "selected" : ""}>${v.label}</option>`).join("")}
      </select></div>
    </form>`,
    buttons: {
      forge: {
        icon: '<i class="fa-solid fa-coins"></i>', label: "Pour it out",
        callback: html => forgeHoard({ size: html[0].querySelector("form").elements.size.value })
      }
    },
    default: "forge"
  }).render(true);
}

Hooks.on("renderActorDirectory", (app, html) => {
  if (!game.user.isGM) return;
  const el = html instanceof HTMLElement ? html : html[0];
  if (el.querySelector(".vanity-forge")) return;
  const bar = document.createElement("div");
  bar.className = "vanity-forge";
  bar.innerHTML = `
    <span class="forge-title">The Forge</span>
    <button type="button" data-forge="hero" title="Generate a ready-to-play character"><i class="fa-solid fa-user-plus"></i> Hero</button>
    <button type="button" data-forge="monster" title="Generate a monster (§20)"><i class="fa-solid fa-dragon"></i> Monster</button>
    <button type="button" data-forge="face" title="Generate a townsfolk NPC with wants and secrets"><i class="fa-solid fa-masks-theater"></i> NPC</button>
    <button type="button" data-forge="hoard" title="Generate treasure worth carousing away"><i class="fa-solid fa-coins"></i> Hoard</button>
    <button type="button" data-forge="encounter" title="Foes, situation, terrain, complication and loot"><i class="fa-solid fa-swords"></i> Encounter</button>
    <button type="button" data-forge="stage" title="Raise a generated battlemap with walls, doors and lights"><i class="fa-solid fa-map"></i> Stage</button>
    <button type="button" data-forge="carouse" title="Burn gold for Glory, then face the Morning After"><i class="fa-solid fa-wine-glass"></i> Carouse</button>
    <button type="button" data-forge="adventure" title="A complete one-shot: patron, job, villain, map, twist and loot"><i class="fa-solid fa-scroll"></i> Adventure</button>
    <button type="button" data-forge="vaincrown" title="Stage the whole Vain Crown: village, fight, forest, barrow — maps, NPCs, foes, treasure"><i class="fa-solid fa-crown"></i> Vain Crown</button>`;
  bar.addEventListener("click", ev => {
    const which = ev.target.closest("[data-forge]")?.dataset.forge;
    if (which === "hero") forgeHeroDialog();
    else if (which === "monster") forgeMonsterDialog();
    else if (which === "face") forgeFace();
    else if (which === "hoard") forgeHoardDialog();
    else if (which === "encounter") forgeEncounterDialog();
    else if (which === "stage") forgeStageDialog();
    else if (which === "carouse") carouseDialog();
    else if (which === "adventure") forgeAdventureDialog();
    else if (which === "vaincrown") {
      Dialog.confirm({ title: "Stage The Vain Crown?",
        content: "<p>This builds <b>four scenes</b> (village, the green, the wood, the barrow), places <b>every NPC, beast and foe</b> as tokens, rolls the finale hoard, and writes the full adventure journal. It takes a minute and creates a lot of content.</p>",
        yes: () => stageVainCrown() });
    }
  });
  (el.querySelector(".directory-footer") ?? el).appendChild(bar);
});

/* -------------------------------------------- */
/*  Content import (first launch of a world)     */
/* -------------------------------------------- */

async function offerContentImport() {
  if (!game.user.isGM) return;
  if (game.settings.get("vanity", "contentImported")) return;
  if (game.journal.size > 0 || game.actors.size > 0) return; // not a fresh world

  new Dialog({
    title: "VANITY — set the stage?",
    content: `<p style="font-size:1.05em">Import everything into this world? You'll get the <b>Draft 10 rulebook</b>,
      the <b>GM screen</b>, the adventure <b>The Vain Crown</b>, the <b>bestiary</b>, the <b>five ready-to-play heroes</b>,
      and all <b>gear, spells and roll tables</b>, filed into tidy folders.</p>
      <p><em>You can always import later from the Compendium tab.</em></p>`,
    buttons: {
      yes: {
        icon: '<i class="fa-solid fa-crown"></i>',
        label: "Import it all",
        callback: async () => {
          for (const pack of game.packs.filter(p => p.metadata.packageName === "vanity")) {
            await pack.importAll({ folderName: pack.metadata.label.replace("VANITY · ", "") });
          }
          await game.settings.set("vanity", "contentImported", true);
          ui.notifications.info("VANITY: all content imported. Break a leg — gloriously.");
        }
      },
      later: { icon: '<i class="fa-solid fa-clock"></i>', label: "Not now" },
      never: {
        icon: '<i class="fa-solid fa-xmark"></i>',
        label: "Don't ask again",
        callback: () => game.settings.set("vanity", "contentImported", true)
      }
    },
    default: "yes"
  }).render(true);
}

/* -------------------------------------------- */
/*  Init                                         */
/* -------------------------------------------- */

Hooks.once("init", () => {
  console.log("VANITY | Be vain and you shine — but the brighter you burn, the bigger the bill.");

  // Conditions become one-click token markers (§11b/§32).
  CONFIG.statusEffects = VANITY_CONDITIONS.map(c => ({
    id: c.id,
    name: c.name,
    img: `systems/vanity/assets/conditions/${c.id}.png`,
    _vanity: { short: c.short, ends: c.ends, group: c.group }
  }));
  CONFIG.specialStatusEffects.DEFEATED = "taken-out";

  CONFIG.Actor.documentClass = VanityActor;
  CONFIG.Combatant.documentClass = VanityCombatant;
  CONFIG.Item.documentClass = VanityItem;
  CONFIG.Combat.initiative = { formula: "1d6", decimals: 0 };

  game.vanity = {
    rollPool, promptAndRoll, ATTRIBUTES, KNACKS, MANEUVERS,
    spend: handleSpend, push: handlePush, twist: twistTheKnife, reckoning: reckoningNow, vainCrown: stageVainCrown,
    forge: { hero: forgeHero, monster: forgeMonster, face: forgeFace, hoard: forgeHoard, encounter: forgeEncounter, stage: forgeStage, adventure: forgeAdventure },
    carouse
  };

  foundry.documents.collections.Actors.unregisterSheet("core", foundry.appv1.sheets.ActorSheet);
  foundry.documents.collections.Actors.registerSheet("vanity", VanityActorSheet, {
    types: ["character"], makeDefault: true, label: "VANITY Character Sheet"
  });
  foundry.documents.collections.Actors.registerSheet("vanity", VanityNpcSheet, {
    types: ["npc"], makeDefault: true, label: "VANITY NPC Statblock"
  });
  foundry.documents.collections.Items.unregisterSheet("core", foundry.appv1.sheets.ItemSheet);
  foundry.documents.collections.Items.registerSheet("vanity", VanityItemSheet, { makeDefault: true, label: "VANITY Item Sheet" });

  game.settings.register("vanity", "contentImported", {
    name: "Starter content imported", scope: "world", config: false, type: Boolean, default: false
  });
  game.settings.register("vanity", "rerollInitiative", {
    name: "Reroll The Draw every round",
    hint: "Initiative is 1d6, rerolled at the top of every round, as the rules intend.",
    scope: "world", config: true, type: Boolean, default: true
  });

  // Fonts available to journals & drawings
  CONFIG.fontDefinitions["Cinzel"] = {
    editor: true,
    fonts: [
      { urls: ["systems/vanity/fonts/Cinzel-SemiBold.woff2"], weight: 600 },
      { urls: ["systems/vanity/fonts/Cinzel-Bold.woff2"], weight: 700 }
    ]
  };
  CONFIG.fontDefinitions["EB Garamond"] = {
    editor: true,
    fonts: [
      { urls: ["systems/vanity/fonts/EBGaramond-Regular.woff2"], weight: 400 },
      { urls: ["systems/vanity/fonts/EBGaramond-Italic.woff2"], weight: 400, style: "italic" },
      { urls: ["systems/vanity/fonts/EBGaramond-Medium.woff2"], weight: 500 }
    ]
  };

  // Handlebars helpers
  Handlebars.registerHelper("eq", (a, b) => a === b);
  Handlebars.registerHelper("gt", (a, b) => Number(a) > Number(b));
  Handlebars.registerHelper("add", (a, b) => (Number(a) || 0) + (Number(b) || 0));
  Handlebars.registerHelper("checkedIf", v => (v ? "checked" : ""));
  Handlebars.registerHelper("concat", (...args) => args.slice(0, -1).join(""));
});

Hooks.once("ready", () => {
  offerContentImport();
});

/* Reroll The Draw at the top of each round. */
Hooks.on("combatRound", async (combat, updateData, updateOptions) => {
  if (!game.user.isGM) return;
  if (!game.settings.get("vanity", "rerollInitiative")) return;
  if ((updateOptions?.direction ?? 1) < 0) return;
  await combat.resetAll();
  await combat.rollAll();
});

/* Make an Entrance — promote a combatant to the top of The Draw without re-rolling
 * for a 6. Right-click a combatant in the tracker. */
function combatantIdFromEntry(li) {
  const el = li?.[0] ?? li;
  return el?.dataset?.combatantId
    ?? el?.closest?.("[data-combatant-id]")?.dataset?.combatantId
    ?? (li?.data ? li.data("combatant-id") : null);
}
async function promoteToTop(combatant) {
  const combat = combatant?.combat ?? game.combat;
  if (!combat || !combatant) return;
  const top = Math.max(0, ...combat.combatants.map(c => (Number.isFinite(c.initiative) ? c.initiative : 0)));
  await combatant.update({ initiative: top + 1 });
}
Hooks.on("getCombatTrackerEntryContext", (html, options) => {
  options.push({
    name: "VANITY: Go first — make an entrance (1 Vanity)",
    icon: '<i class="fa-solid fa-crown"></i>',
    condition: li => {
      const c = game.combat?.combatants.get(combatantIdFromEntry(li));
      return !!c && c.actor?.type === "character" && (game.user.isGM || c.actor?.isOwner);
    },
    callback: async li => {
      const c = game.combat?.combatants.get(combatantIdFromEntry(li));
      if (!c?.actor) return;
      const van = c.actor.system.vanity ?? 0;
      if (van < 1) return ui.notifications.warn(`${c.actor.name} has no Vanity to spend on an entrance.`);
      await c.actor.update({ "system.vanity": van - 1 });
      await promoteToTop(c);
      await ChatMessage.create({
        speaker: { alias: "The Draw" },
        content: `<div class="vanity-roll vanity-tab-note"><p><b>${c.name}</b> spends <b>1 Vanity</b> and makes an entrance — <b>first in the round</b>.</p></div>`
      });
    }
  });
  options.push({
    name: "VANITY: Move to top of the order",
    icon: '<i class="fa-solid fa-angles-up"></i>',
    condition: () => game.user.isGM,
    callback: async li => {
      const c = game.combat?.combatants.get(combatantIdFromEntry(li));
      if (c) await promoteToTop(c);
    }
  });
});

/* Chat card buttons. */
Hooks.on("renderChatMessageHTML", (message, html) => {
  html.querySelectorAll(".vanity-push").forEach(btn => {
    btn.addEventListener("click", () => {
      if (!game.user.isGM && message.author?.id !== game.user.id) {
        return ui.notifications.warn("Only the roller (or the GM) may Push.");
      }
      handlePush(message);
    });
  });
  html.querySelectorAll(".vanity-fizzle").forEach(btn => {
    btn.addEventListener("click", () => {
      if (!game.user.isGM && message.author?.id !== game.user.id) return;
      handleFizzle(message);
    });
  });
  html.querySelectorAll(".vanity-spend button").forEach(btn => {
    btn.addEventListener("click", () => {
      if (!game.user.isGM && message.author?.id !== game.user.id) {
        return ui.notifications.warn("Only the roller (or the GM) may spend Successes.");
      }
      handleSpend(message, btn.dataset);
    });
  });
  html.querySelectorAll(".vanity-apply").forEach(btn => {
    btn.addEventListener("click", () => {
      if (!game.user.isGM) return ui.notifications.warn("Only the GM applies damage.");
      applyDamageToTarget(message, Number(btn.dataset.damage) || 0);
    });
  });
  html.querySelectorAll(".vanity-burn").forEach(btn => {
    btn.addEventListener("click", () => {
      if (!game.user.isGM && message.author?.id !== game.user.id) {
        return ui.notifications.warn("Only the roller (or the GM) may burn Successes.");
      }
      handleBurn(message);
    });
  });
  html.querySelectorAll(".vanity-takebane").forEach(btn => {
    btn.addEventListener("click", () => {
      if (!game.user.isGM && message.author?.id !== game.user.id) {
        return ui.notifications.warn("Only the roller (or the GM) may take the Bane.");
      }
      handleTakeBane(message);
    });
  });
  html.querySelectorAll(".vanity-twist").forEach(btn => {
    btn.addEventListener("click", () => {
      if (!game.user.isGM) return ui.notifications.warn("Only the GM may twist the knife.");
      twistTheKnife({
        actorUuid: btn.dataset.actorUuid ?? "",
        free: btn.dataset.free === "true",
        sourceMessage: btn.dataset.free === "true" ? message : null
      });
    });
  });
  html.querySelectorAll(".vanity-reckon").forEach(btn => {
    btn.addEventListener("click", () => {
      if (!game.user.isGM) return ui.notifications.warn("Only the GM may call the Reckoning.");
      reckoningNow({ actorUuid: btn.dataset.actorUuid ?? "" });
    });
  });
});

/* Token defaults — and nobody goes unarmed. */
Hooks.on("preCreateActor", (actor, data) => {
  const bar = { displayBars: CONST.TOKEN_DISPLAY_MODES.OWNER_HOVER, bar1: { attribute: "grit" } };
  if (actor.type === "character") {
    actor.updateSource({ prototypeToken: { ...bar, actorLink: true, displayName: CONST.TOKEN_DISPLAY_MODES.HOVER } });
    const hasUnarmed = actor._source.items?.some(i => i.type === "weapon" && i.name === UNARMED_STRIKE.name);
    if (!hasUnarmed) {
      actor.updateSource({ items: [...(actor._source.items ?? []), foundry.utils.deepClone(UNARMED_STRIKE)] });
    }
  } else {
    actor.updateSource({ prototypeToken: { ...bar, displayName: CONST.TOKEN_DISPLAY_MODES.HOVER } });
  }
});

/* -------------------------------------------- */
/*  THE STAGE — battlemap & scene generator      */
/*  (v14 Levels-safe; recipe shared w/ mapwright)*/
/* -------------------------------------------- */

const STAGE_GS = 100;
const STAGE_SIZES = { small: [24, 16], medium: [30, 20], large: [38, 26] };

const STAGE_NAMES = {
  barrow: [["The Barrow of the", "The Tomb of the", "The Vault of the", "The Halls of the"],
           ["Hollow King", "Vain Queen", "Gilded Court", "Silent Host", "Forgotten Name", "Peacock Prince"]],
  cave:   [["The Gullet", "The Weeping", "The Howling", "The Black", "The Salt", "The Candle"],
           ["Caves", "Deep", "Warren", "Throat", "Galleries"]],
  fen:    [["The Weeping", "The Drowned", "The Mirror", "The Pale", "The Whispering"],
           ["Fen", "Marsh", "Mire", "Flats"]],
  village: [["Nettlebrook", "Marrowdown", "Gallowsmoor", "Peddler's Rest", "Thistlewick", "Mudholt", "Crowbeck"],
            ["", "", ""]],
  forest: [["The Whispering", "The Tanglewood", "The Elder", "The Hollow", "The Thornmarch"],
           ["Wood", "Forest", "Wilds", "Greenway", "Thicket"]]
};
function stageName(type) { const [a, b] = STAGE_NAMES[type]; const t = `${rnd(a)} ${rnd(b)}`.trim(); return t; }

const d = n => 1 + Math.floor(Math.random() * n);

/* ---------- layouts ---------- */

function genBarrow(cols, rows) {
  const g = Array.from({ length: rows }, () => new Array(cols).fill(0));
  const rooms = [];
  const target = Math.max(4, Math.floor((cols * rows) / 60));
  for (let i = 0; i < 90 && rooms.length < target; i++) {
    const w = 3 + Math.floor(Math.random() * 5), h = 3 + Math.floor(Math.random() * 4);
    const x = 1 + Math.floor(Math.random() * (cols - w - 2));
    const y = 1 + Math.floor(Math.random() * (rows - h - 2));
    let ok = true;
    for (let yy = y - 1; yy <= y + h && ok; yy++) for (let xx = x - 1; xx <= x + w; xx++) {
      if (g[yy]?.[xx]) { ok = false; break; }
    }
    if (!ok) continue;
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) g[yy][xx] = 1;
    rooms.push({ x, y, w, h, cx: x + Math.floor(w / 2), cy: y + Math.floor(h / 2) });
  }
  rooms.sort((a, b) => a.cx - b.cx);
  const doors = [];
  const seen = new Set();
  for (let i = 1; i < rooms.length; i++) {
    const a = rooms[i - 1], b = rooms[i];
    let x = a.cx, y = a.cy, prev = null;
    const step = (nx, ny) => {
      const was = g[ny][nx];
      const t = was === 1 ? 1 : 2;
      if (!was) g[ny][nx] = 2;
      if (prev && prev.t !== t) {
        const key = [prev.x, prev.y, nx, ny].join(",");
        if (!seen.has(key)) { seen.add(key); doors.push({ ax: prev.x, ay: prev.y, bx: nx, by: ny }); }
      }
      prev = { x: nx, y: ny, t };
    };
    step(x, y);
    while (x !== b.cx) { x += Math.sign(b.cx - x); step(x, y); }
    while (y !== b.cy) { y += Math.sign(b.cy - y); step(x, y); }
  }
  return { g, rooms, doors };
}

function genCave(cols, rows) {
  let g = Array.from({ length: rows }, (_, y) => new Array(cols).fill(0).map((_, x) =>
    (x === 0 || y === 0 || x === cols - 1 || y === rows - 1) ? 0 : (Math.random() < 0.55 ? 1 : 0)));
  for (let it = 0; it < 4; it++) {
    const nx = g.map(r => [...r]);
    for (let y = 1; y < rows - 1; y++) for (let x = 1; x < cols - 1; x++) {
      let n = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (dx || dy) n += g[y + dy][x + dx];
      }
      nx[y][x] = (g[y][x] ? n >= 4 : n >= 5) ? 1 : 0;
    }
    g = nx;
  }
  // keep the largest connected floor region
  const label = Array.from({ length: rows }, () => new Array(cols).fill(0));
  let best = 0, bestId = 0, id = 0;
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    if (!g[y][x] || label[y][x]) continue;
    id += 1; let count = 0;
    const stack = [[x, y]];
    label[y][x] = id;
    while (stack.length) {
      const [cx, cy] = stack.pop(); count++;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const px = cx + dx, py = cy + dy;
        if (g[py]?.[px] && !label[py][px]) { label[py][px] = id; stack.push([px, py]); }
      }
    }
    if (count > best) { best = count; bestId = id; }
  }
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) g[y][x] = label[y][x] === bestId ? 1 : 0;
  return { g, rooms: [], doors: [] };
}

function genFen(cols, rows) {
  const g = Array.from({ length: rows }, () => new Array(cols).fill(1));
  const pools = [], clumps = [];
  const blob = (cx, cy, r) => {
    const cells = [];
    for (let y = Math.max(1, cy - r); y <= Math.min(rows - 2, cy + r); y++) {
      for (let x = Math.max(1, cx - r); x <= Math.min(cols - 2, cx + r); x++) {
        if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r + Math.random() * 2) cells.push([x, y]);
      }
    }
    return cells;
  };
  for (let i = 0; i < 3 + d(3); i++) pools.push(blob(d(cols - 4) + 1, d(rows - 4) + 1, 1 + d(2)));
  for (let i = 0; i < 4 + d(4); i++) clumps.push(blob(d(cols - 4) + 1, d(rows - 4) + 1, 1));
  return { g, rooms: [], doors: [], pools, clumps };
}

function genVillage(cols, rows) {
  const g = Array.from({ length: rows }, () => new Array(cols).fill(1));
  const buildings = [];
  const cxg = cols / 2, cyg = rows / 2;
  const clash = (x, y, w, h) => buildings.some(b => x < b.x + b.w + 1 && x + w + 1 > b.x && y < b.y + b.h + 1 && y + h + 1 > b.y);
  const target = Math.max(5, Math.floor((cols * rows) / 70));
  for (let i = 0; i < 140 && buildings.length < target; i++) {
    const w = 3 + Math.floor(Math.random() * 3), h = 3 + Math.floor(Math.random() * 2);
    const x = 2 + Math.floor(Math.random() * (cols - w - 4));
    const y = 2 + Math.floor(Math.random() * (rows - h - 4));
    if (Math.abs(x + w / 2 - cxg) < 3.5 && Math.abs(y + h / 2 - cyg) < 3.5) continue; // keep the green clear
    if (clash(x, y, w, h)) continue;
    const edges = ["top", "bottom", "left", "right"];
    buildings.push({ x, y, w, h, doorEdge: rnd(edges), roof: rnd(["#7a2f2f", "#6a4a2a", "#5a3d24", "#734a30"]) });
  }
  const segs = [];
  for (const b of buildings) {
    const { x, y, w, h, doorEdge } = b;
    const run = (x1, y1, x2, y2, edge) => {
      if (edge === doorEdge) {
        // punch a 1-cell door in the middle of the edge
        if (y1 === y2) { const dx = x1 + Math.floor((x2 - x1) / 2);
          if (dx > x1) segs.push({ x1, y1, x2: dx, y2, kind: "wall" });
          segs.push({ x1: dx, y1, x2: dx + 1, y2, kind: "door" });
          if (dx + 1 < x2) segs.push({ x1: dx + 1, y1, x2, y2, kind: "wall" });
        } else { const dy = y1 + Math.floor((y2 - y1) / 2);
          if (dy > y1) segs.push({ x1, y1, x2, y2: dy, kind: "wall" });
          segs.push({ x1, y1: dy, x2, y2: dy + 1, kind: "door" });
          if (dy + 1 < y2) segs.push({ x1, y1: dy + 1, x2, y2, kind: "wall" });
        }
      } else segs.push({ x1, y1, x2, y2, kind: "wall" });
    };
    run(x, y, x + w, y, "top");
    run(x, y + h, x + w, y + h, "bottom");
    run(x, y, x, y + h, "left");
    run(x + w, y, x + w, y + h, "right");
  }
  const well = { x: Math.floor(cxg), y: Math.floor(cyg) };
  const rooms = buildings.map(b => ({ cx: b.x + Math.floor(b.w / 2), cy: b.y + Math.floor(b.h / 2), ...b }));
  return { g, buildings, well, segments: segs, rooms };
}

function genForest(cols, rows) {
  const g = Array.from({ length: rows }, () => new Array(cols).fill(1));
  const trees = [];
  const clearing = { x: cols - 5, y: Math.floor(rows / 2), r: 3.2 };
  const nearClear = (x, y) => (x - clearing.x) ** 2 + (y - clearing.y) ** 2 < (clearing.r + 1.5) ** 2;
  // a winding path from the west edge to the clearing
  const path = [];
  let py = Math.floor(rows / 2);
  for (let x = 1; x <= clearing.x; x++) {
    py = Math.max(2, Math.min(rows - 3, py + (Math.random() < 0.5 ? -1 : 1) * (Math.random() < 0.4 ? 1 : 0)));
    path.push([x, py]);
  }
  const onPath = (x, y) => path.some(([px, py2]) => Math.abs(px - x) <= 1 && Math.abs(py2 - y) <= 1);
  const segs = [];
  const count = Math.floor(cols * rows / 12);
  for (let i = 0; i < count; i++) {
    const x = 1 + Math.random() * (cols - 2), y = 1 + Math.random() * (rows - 2);
    if (nearClear(x, y) || onPath(Math.round(x), Math.round(y))) continue;
    const r = 0.5 + Math.random() * 0.6;
    trees.push({ x, y, r });
    if (Math.random() < 0.4) { // some trees block line of sight & movement (a thicket)
      const gx = Math.round(x), gy = Math.round(y);
      segs.push({ x1: gx, y1: gy, x2: gx + 1, y2: gy, kind: "wall" });
      segs.push({ x1: gx, y1: gy, x2: gx, y2: gy + 1, kind: "wall" });
    }
  }
  return { g, trees, path, clearing, segments: segs, rooms: [] };
}

/* ---------- walls from a cell grid ---------- */

function stageWalls(g, cols, rows, doors) {
  const floor = (x, y) => (g[y]?.[x] ?? 0) > 0;
  const segs = [];
  // vertical boundaries (between column x-1 and x)
  for (let x = 0; x <= cols; x++) {
    let run = null;
    for (let y = 0; y <= rows; y++) {
      const boundary = y < rows && (floor(x - 1, y) !== floor(x, y));
      if (boundary && !run) run = y;
      if (!boundary && run !== null) { segs.push({ x1: x, y1: run, x2: x, y2: y, kind: "wall" }); run = null; }
    }
  }
  // horizontal boundaries
  for (let y = 0; y <= rows; y++) {
    let run = null;
    for (let x = 0; x <= cols; x++) {
      const boundary = x < cols && (floor(x, y - 1) !== floor(x, y));
      if (boundary && run === null) run = x;
      if (!boundary && run !== null) { segs.push({ x1: run, y1: y, x2: x, y2: y, kind: "wall" }); run = null; }
    }
  }
  for (const dd of doors ?? []) {
    if (dd.ay === dd.by) { // horizontal neighbours → vertical door edge
      const x = Math.max(dd.ax, dd.bx);
      segs.push({ x1: x, y1: dd.ay, x2: x, y2: dd.ay + 1, kind: "door" });
    } else {
      const y = Math.max(dd.ay, dd.by);
      segs.push({ x1: dd.ax, y1: y, x2: dd.ax + 1, y2: y, kind: "door" });
    }
  }
  return segs;
}

/* ---------- rendering ---------- */

function stageSVG(type, model, cols, rows) {
  const gs = STAGE_GS, W = cols * gs, H = rows * gs;
  const g = model.g;
  const floor = (x, y) => (g[y]?.[x] ?? 0) > 0;
  const jitter = (x, y, spread) => ((Math.sin(x * 127.1 + y * 311.7) * 43758.5453) % 1 + 1) % 1 * spread;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">`;

  if (type === "village") {
    s += `<rect width="${W}" height="${H}" fill="#28401f"/>`;
    // mottled grass
    for (let i = 0; i < cols * rows * 2; i++) {
      const x = Math.random() * W, y = Math.random() * H;
      s += `<circle cx="${x}" cy="${y}" r="${6 + Math.random() * 14}" fill="${Math.random() < 0.5 ? "#2e4a24" : "#233a1c"}" opacity="0.5"/>`;
    }
    // dirt roads radiating from the green
    const wx = model.well.x * gs + gs / 2, wy = model.well.y * gs + gs / 2;
    for (const b of model.buildings) {
      const bx = (b.x + b.w / 2) * gs, by = (b.y + b.h / 2) * gs;
      s += `<line x1="${wx}" y1="${wy}" x2="${bx}" y2="${by}" stroke="#6b5636" stroke-width="26" stroke-linecap="round" opacity="0.65"/>`;
    }
    // the green + well
    s += `<circle cx="${wx}" cy="${wy}" r="${gs * 2.6}" fill="#33521f" opacity="0.55"/>`;
    s += `<circle cx="${wx}" cy="${wy}" r="${gs * 0.42}" fill="#5c5342" stroke="#2a2317" stroke-width="6"/><circle cx="${wx}" cy="${wy}" r="${gs * 0.24}" fill="#0d1a1f"/>`;
    // building footprints (roofs)
    for (const b of model.buildings) {
      const x = b.x * gs, y = b.y * gs, w = b.w * gs, h = b.h * gs;
      s += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#2a2016" opacity="0.5"/>`;
      s += `<rect x="${x + 4}" y="${y + 4}" width="${w - 8}" height="${h - 8}" fill="${b.roof}" stroke="#2a1a12" stroke-width="4"/>`;
      s += `<line x1="${x + 8}" y1="${y + h / 2}" x2="${x + w - 8}" y2="${y + h / 2}" stroke="#2a1a12" stroke-width="3" opacity="0.6"/>`;
    }
    // a few trees at the edges
    for (let i = 0; i < 10; i++) {
      const x = Math.random() * W, y = Math.random() * H;
      s += `<circle cx="${x}" cy="${y}" r="${gs * 0.5}" fill="#16260f"/><circle cx="${x - 6}" cy="${y - 8}" r="${gs * 0.38}" fill="#28401c"/>`;
    }
    drawWalls();
  } else if (type === "forest") {
    s += `<rect width="${W}" height="${H}" fill="#1c2f14"/>`;
    for (let i = 0; i < cols * rows * 2.4; i++) {
      const x = Math.random() * W, y = Math.random() * H;
      s += `<path d="M${x} ${y} q3 -12 ${5 - Math.random() * 10} -16" stroke="${Math.random() < 0.5 ? "#243d18" : "#2f4d1f"}" stroke-width="3" fill="none" opacity="0.6"/>`;
    }
    // the path
    if (model.path?.length) {
      const pts = model.path.map(([x, y]) => `${x * gs + gs / 2},${y * gs + gs / 2}`).join(" ");
      s += `<polyline points="${pts}" fill="none" stroke="#6b5636" stroke-width="30" stroke-linecap="round" stroke-linejoin="round" opacity="0.7"/>`;
    }
    // clearing
    const cx = model.clearing.x * gs + gs / 2, cy = model.clearing.y * gs + gs / 2;
    s += `<circle cx="${cx}" cy="${cy}" r="${model.clearing.r * gs}" fill="#33511d" opacity="0.6"/>`;
    // the barrow mouth in the clearing
    s += `<ellipse cx="${cx}" cy="${cy}" rx="${gs * 0.9}" ry="${gs * 0.6}" fill="#0c1410"/><path d="M${cx - gs * 0.9} ${cy} a${gs * 0.9} ${gs * 0.9} 0 0 1 ${gs * 1.8} 0" fill="#3a2f1e" stroke="#1a140c" stroke-width="5"/>`;
    // tree canopies
    for (const t of model.trees) {
      const x = t.x * gs, y = t.y * gs, r = t.r * gs;
      s += `<circle cx="${x}" cy="${y}" r="${r * 1.15}" fill="#0f1f0a"/><circle cx="${x - r * 0.3}" cy="${y - r * 0.35}" r="${r * 0.85}" fill="#24401a"/><circle cx="${x + r * 0.25}" cy="${y + r * 0.1}" r="${r * 0.6}" fill="#1a3312"/>`;
    }
  } else if (type === "fen") {
    s += `<rect width="${W}" height="${H}" fill="#1a352e"/>`;
    for (let i = 0; i < cols * rows * 1.5; i++) {
      const x = Math.random() * W, y = Math.random() * H;
      s += `<path d="M${x} ${y} q3 -14 ${6 - Math.random() * 12} -20" stroke="${Math.random() < 0.5 ? "#264a3e" : "#31584a"}" stroke-width="3" fill="none" opacity="0.7"/>`;
    }
    for (const pool of model.pools) {
      for (const [x, y] of pool) s += `<rect x="${x * gs - 8}" y="${y * gs - 8}" width="${gs + 16}" height="${gs + 16}" rx="34" fill="#123c38" opacity="0.92"/>`;
    }
    for (const pool of model.pools) {
      for (const [x, y] of pool) s += `<rect x="${x * gs + 8}" y="${y * gs + 8}" width="${gs - 16}" height="${gs - 16}" rx="30" fill="#14544e" opacity="0.9"/>`;
    }
    for (const clump of model.clumps) {
      for (const [x, y] of clump) {
        const cx = (x + 0.5) * gs + jitter(x, y, 30) - 15, cy = (y + 0.5) * gs + jitter(y, x, 30) - 15;
        s += `<circle cx="${cx}" cy="${cy}" r="${gs * 0.52}" fill="#0f231f"/><circle cx="${cx - 10}" cy="${cy - 12}" r="${gs * 0.4}" fill="#1e3b33"/>`;
      }
    }
    for (let i = 0; i < 40; i++) {
      const x = Math.random() * W, y = Math.random() * H;
      s += `<path d="M${x} ${y} l2 -22 M${x} ${y} l8 -18" stroke="#8a6a20" stroke-width="2.5" fill="none" opacity="0.6"/>`;
    }
  } else {
    s += `<rect width="${W}" height="${H}" fill="${type === "cave" ? "#0d1614" : "#111c1a"}"/>`;
    const base = type === "cave" ? [201, 185, 152] : [222, 208, 176];
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      if (!floor(x, y)) continue;
      const t = jitter(x, y, 22) - 11;
      const fill = `rgb(${base[0] + t},${base[1] + t},${base[2] + t * 1.2})`;
      if (type === "cave") {
        s += `<rect x="${x * gs - 7}" y="${y * gs - 7}" width="${gs + 14}" height="${gs + 14}" rx="26" fill="${fill}"/>`;
      } else {
        s += `<rect x="${x * gs}" y="${y * gs}" width="${gs}" height="${gs}" fill="${fill}"/>`;
      }
    }
    // faint grid on floor + speckle
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      if (!floor(x, y)) continue;
      if (type === "barrow") s += `<rect x="${x * gs}" y="${y * gs}" width="${gs}" height="${gs}" fill="none" stroke="#2a2317" stroke-opacity="0.10"/>`;
      if (Math.random() < 0.12) s += `<circle cx="${x * gs + 10 + Math.random() * 80}" cy="${y * gs + 10 + Math.random() * 80}" r="${2 + Math.random() * 4}" fill="#2a2317" opacity="0.18"/>`;
    }
    drawWalls();
  }
  function drawWalls() {
    for (const seg of model.segments) {
      const x1 = seg.x1 * gs, y1 = seg.y1 * gs, x2 = seg.x2 * gs, y2 = seg.y2 * gs;
      if (seg.kind === "door") {
        s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#b0872f" stroke-width="16" stroke-linecap="butt"/>`;
        s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#e0c98a" stroke-width="6" stroke-dasharray="10 8"/>`;
      } else {
        s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#1a1108" stroke-width="12" stroke-linecap="square"/>`;
      }
    }
  }
  s += "</svg>";
  return s;
}

/* ---------- scene assembly ---------- */

async function stageRasterUpload(svg, W, H, name) {
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = () => rej(new Error("SVG raster failed")); img.src = url; });
    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    canvas.getContext("2d").drawImage(img, 0, 0, W, H);
    const png = await new Promise(res => canvas.toBlob(res, "image/png"));
    const FP = foundry.applications?.apps?.FilePicker?.implementation ?? FilePicker;
    try { await FP.createDirectory("data", "vanity-stage"); } catch (e) { /* exists */ }
    const filename = `${name.slugify()}-${Date.now()}.png`;
    const up = await FP.upload("data", "vanity-stage", new File([png], filename, { type: "image/png" }), {}, { notify: false });
    if (!up?.path) throw new Error("Upload failed — check file upload permissions.");
    return String(up.path).replace(/^\/+/, "");
  } finally { URL.revokeObjectURL(url); }
}

async function forgeStage({ type = "barrow", size = "medium", name = "", populate = false, heat = "fight", kind = "", cast = null, activate = true, post = true, folderId = null } = {}) {
  if (!game.user.isGM) return;
  const [cols, rows] = STAGE_SIZES[size] ?? STAGE_SIZES.medium;
  name ||= stageName(type);
  ui.notifications.info(`The Stage: raising “${name}”…`);

  const model = type === "cave" ? genCave(cols, rows) : type === "fen" ? genFen(cols, rows)
    : type === "village" ? genVillage(cols, rows) : type === "forest" ? genForest(cols, rows) : genBarrow(cols, rows);
  if (type === "barrow" || type === "cave") model.segments = stageWalls(model.g, cols, rows, model.doors);
  else if (type === "fen") model.segments = [];
  // village/forest already carry model.segments
  const svg = stageSVG(type, model, cols, rows);
  const gs = STAGE_GS, W = cols * gs, H = rows * gs;
  const bgPath = await stageRasterUpload(svg, W, H, name);

  const scene = await Scene.create({
    name,
    width: W, height: H, padding: 0,
    grid: { type: CONST.GRID_TYPES?.SQUARE ?? 1, size: gs, distance: 5, units: "ft" },
    tokenVision: !["fen", "village", "forest"].includes(type),
    fog: { exploration: !["fen", "village", "forest"].includes(type) },
    environment: ["fen", "village", "forest"].includes(type) ? { globalLight: { enabled: true } } : {},
    navigation: true
  });

  // v14: the background lives on the scene's default Level.
  const lv = scene.levels?.contents?.[0];
  if (lv) await scene.updateEmbeddedDocuments("Level", [{ _id: lv.id, background: { src: bgPath, color: "#0a1a18" } }]);
  else await scene.update({ background: { src: bgPath } });

  if (model.segments.length) {
    const K = {
      move: CONST.WALL_MOVEMENT_TYPES?.NORMAL ?? 20,
      sense: CONST.WALL_SENSE_TYPES?.NORMAL ?? 20,
      door: CONST.WALL_DOOR_TYPES?.DOOR ?? 1,
      closed: CONST.WALL_DOOR_STATES?.CLOSED ?? 0
    };
    const walls = model.segments.map(s => ({
      c: [s.x1 * gs, s.y1 * gs, s.x2 * gs, s.y2 * gs],
      move: K.move, sight: K.sense, sound: K.sense, light: K.sense,
      ...(s.kind === "door" ? { door: K.door, ds: K.closed } : {})
    }));
    await scene.createEmbeddedDocuments("Wall", walls);
  }

  // lights
  const lights = [];
  const floorCells = [];
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) if ((model.g[y]?.[x] ?? 0) > 0) floorCells.push([x, y]);
  if (type === "barrow") {
    for (const r of model.rooms) {
      if (Math.random() < 0.65) lights.push({
        x: (r.cx + 0.5) * gs, y: (r.cy + 0.5) * gs,
        config: { bright: 10, dim: 25, color: "#b0872f", alpha: 0.3, animation: { type: "torch", speed: 3, intensity: 4 } }
      });
    }
  } else if (type === "cave") {
    for (const [x, y] of pickN(floorCells, 3)) lights.push({
      x: (x + 0.5) * gs, y: (y + 0.5) * gs,
      config: { bright: 5, dim: 20, color: "#1c6f66", alpha: 0.25, animation: { type: "pulse", speed: 2, intensity: 3 } }
    });
  }
  if (lights.length) await scene.createEmbeddedDocuments("AmbientLight", lights);

  // placement: a supplied cast, else an auto-encounter
  let placed = cast;
  if (!placed && populate) {
    const enc = await forgeEncounter({ heat, kind, forStage: name, post, folderId });
    placed = enc.actors.map(a => ({ actorId: a.id, name: a.name, img: a.img, disposition: -1 }));
  }
  if (placed?.length) {
    const rooms = model.rooms?.length > 1 ? model.rooms.slice(1).map(r => [r.cx, r.cy]) : [];
    const open = pickN(floorCells.filter(([x, y]) => !model.segments.some(sg =>
      sg.kind !== "door" && Math.min(sg.x1, sg.x2) <= x && x < Math.max(sg.x1, sg.x2) + 1 &&
      Math.min(sg.y1, sg.y2) <= y && y < Math.max(sg.y1, sg.y2) + 1)), placed.length + 4);
    const spots = (type === "barrow" && rooms.length) ? rooms : open.length ? open : floorCells;
    const tokens = placed.map((a, i) => {
      const [x, y] = spots[i % spots.length] ?? [1 + i, 1];
      const actor = game.actors.get(a.actorId);
      return { name: a.name ?? actor?.name, actorId: a.actorId, texture: { src: a.img ?? actor?.img },
        x: x * gs, y: y * gs, width: 1, height: 1, disposition: a.disposition ?? -1, hidden: !!a.hidden };
    });
    if (tokens.length) await scene.createEmbeddedDocuments("Token", tokens);
  }

  if (activate) await scene.activate();
  if (post) await ChatMessage.create({
    speaker: { alias: "The Stage" },
    whisper: ChatMessage.getWhisperRecipients("GM"),
    content: `<div class="vanity-roll vanity-forge-card">
      <header><span class="vanity-roll-label">🎭 The stage is set</span>
      <span class="vanity-roll-sub">${type} · ${cols}×${rows} · ${model.segments.length} walls${populate ? " · populated" : ""}</span></header>
      <p><b>${name}</b> is raised and active. ${type === "fen" ? "Open ground — no fog, daylight." : "Token vision and fog are on; doors are gold on the map."}</p>
    </div>`
  });
  return scene;
}

/* -------------------------------------------- */
/*  THE ENCOUNTER — situation, foes & spoils     */
/* -------------------------------------------- */

const ENCOUNTER_SITUATIONS = [
  "They're arguing over the split of fresh loot — half of them aren't watching the door.",
  "An ambush: they saw you first. No Reaction roll — Hostile, and they have position.",
  "Mid-ritual. Interrupting it is loud; letting it finish is worse.",
  "Feeding. It does not want to share.",
  "Lost, frightened, and twice as dangerous for it.",
  "Guarding a door they were told never to open. They're curious too.",
  "Burying one of their own — grief has made them either vicious or reasonable.",
  "Counting heads. One of them is missing, and they think you know why.",
  "Holding a prisoner who might be worth more to you than to them.",
  "Asleep — with one terrible, wide-awake sentry.",
  "Tracking something, and it isn't you. Yet.",
  "Setting a trap meant for something much bigger.",
  "In tense parley with a second party who like you even less.",
  "Licking wounds from an earlier fight. Someone owes them.",
  "Celebrating loudly. The wine is doing half your work.",
  "Waiting for a signal that is never going to come.",
  "Praying — to something that occasionally answers.",
  "Dividing the last of their food. Desperation has a smell."
];

const ENCOUNTER_TERRAIN = [
  "A brazier full of hot coals, begging to be kicked (Environment, 1 Success).",
  "A rope bridge over the dark — Drive Back has opinions here.",
  "Chest-high tombs in tight rows: cover everywhere, charging nowhere.",
  "An oil slick from a shattered lamp, one spark from mattering.",
  "A scree slope — Athletics to charge across, or arrive winded.",
  "A great bell. Any Bane spent may ring it, and everything will know.",
  "A deep black pool splits the field in two.",
  "Scaffolding overhead, groaning, held by exactly one rope.",
  "Knee-deep mist: everything below the waist is a guess.",
  "A portcullis winch in the far corner — first to it owns the exit.",
  "A long ledge and a longer drop.",
  "Pillars everywhere — Backstab country."
];

const ENCOUNTER_COMPLICATIONS = [
  "A prisoner here knows the way you need. Keep them breathing.",
  "One of them wants to defect — if given one dignified excuse.",
  "Reinforcements arrive in 3 rounds if this gets loud.",
  "Their loot is cursed, and they know it. They'd love you to take it.",
  "A rival crew watches from cover, waiting to pick off the winners.",
  "The roof is unstable. Every 2-Success Environment spend brings some down.",
  "One carries a letter naming their employer. That name matters.",
  "They've mistaken you for someone who owes them money. A lot of it.",
  "The smallest one is the actual leader.",
  "Something bigger hunts THEM. It is closer than anyone thinks.",
  "They'll fold fast before real showmanship — Vice bait, +1 Vanity for grandstanding.",
  "The way out closes at the end of round 5. Everyone can hear it grinding."
];

const HEAT_BUILDS = {
  skirmish:  () => ({ mook: 2 + d(3), standard: Math.random() < 0.5 ? 1 : 0, threat: 0, nemesis: 0 }),
  fight:     () => ({ mook: d(4), standard: 1 + (Math.random() < 0.5 ? 1 : 0), threat: 0, nemesis: 0 }),
  battle:    () => ({ mook: d(4), standard: 1, threat: 1, nemesis: 0 }),
  nightmare: () => ({ mook: 0, standard: d(3), threat: Math.random() < 0.4 ? 1 : 0, nemesis: 1 })
};
const HEAT_HOARD = { skirmish: "pocket", fight: "cache", battle: "chest", nightmare: "vault" };

/**
 * Forge an encounter.
 * @param {boolean} hoard     also roll a hoard. false decouples loot from combat.
 * @param {boolean} post      post the GM card.
 * @param {string}  folderId  put the actors in an existing folder instead of a new one, so a
 *                            caller running many encounters does not litter the world.
 */
async function forgeEncounter({ heat = "fight", kind = "", forStage = "", hoard = true, post = true, folderId = null } = {}) {
  const t = FORGE_MONSTERS[kind] ? kind : rnd(Object.keys(FORGE_MONSTERS));
  const build = (HEAT_BUILDS[heat] ?? HEAT_BUILDS.fight)();
  const folder = folderId
    ? (game.folders?.get?.(folderId) ?? { id: folderId })
    : await Folder.create({ name: `Encounter — ${t} (${heat})`, type: "Actor" });

  const actors = [];
  for (const [menace, count] of Object.entries(build)) {
    for (let i = 0; i < count; i++) actors.push(await forgeMonster({ type: t, menace, silent: true, folderId: folder.id }));
  }

  const situation = rnd(ENCOUNTER_SITUATIONS);
  const terrain = rnd(ENCOUNTER_TERRAIN);
  const complication = rnd(ENCOUNTER_COMPLICATIONS);
  const ambush = situation.startsWith("An ambush");
  let mood = "Hostile", moodDice = [];
  if (!ambush) {
    moodDice = rollDice(2, 6);
    const rs = moodDice.filter(x => x >= 5).length;
    mood = ["Hostile", "Wary", "Neutral", "Friendly"][Math.min(rs, 3)];
  }

  if (post) await ChatMessage.create({
    speaker: { alias: "The Forge" },
    whisper: ChatMessage.getWhisperRecipients("GM"),
    content: `<div class="vanity-roll vanity-forge-card">
      <header><span class="vanity-roll-label">⚒ An encounter takes shape</span>
      <span class="vanity-roll-sub">${heat} · ${t}${forStage ? ` · staged at ${forStage}` : ""} · mood: <b>${mood}</b>${moodDice.length ? ` (${moodDice.join(", ")})` : " (they saw you first)"}</span></header>
      <p><b>Foes:</b> ${actors.map(a => `@UUID[${a.uuid}]{${a.name}}`).join(" · ")}</p>
      <p><b>The scene:</b> ${situation}</p>
      <p><b>The ground:</b> ${terrain}</p>
      <p><b>The catch:</b> <i>${complication}</i></p>
    </div>`
  });
  const hoardResult = hoard ? await forgeHoard({ size: HEAT_HOARD[heat] ?? "cache", post }) : null;
  return { actors, situation, terrain, complication, mood, folder, hoard: hoardResult };
}

/* -------------------------------------------- */
/*  THE CAROUSE — burn gold gloriously (§27)     */
/* -------------------------------------------- */

async function carouse({ actorId = "", gold = 20, rate = 20 } = {}) {
  const actor = game.actors.get(actorId);
  if (!actor || actor.type !== "character") return ui.notifications.warn("Pick a character to carouse.");
  gold = Math.max(0, Math.floor(gold));
  const glory = Math.floor(gold / rate);
  if (glory < 1) return ui.notifications.warn(`It takes ~${rate} gp to buy a single point of Glory. Spend like you mean it.`);
  const purse = actor.system.details.coin ?? { gp: 0, sp: 0, cp: 0 };
  if ((purse.gp ?? 0) < gold) return ui.notifications.warn(`${actor.name} carries only ${purse.gp ?? 0} gp.`);

  await actor.update({
    "system.details.coin.gp": (purse.gp ?? 0) - gold,
    "system.glory": (actor.system.glory ?? 0) + glory
  });

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="vanity-roll vanity-forge-card">
      <header><span class="vanity-roll-label">🍷 The Carouse</span>
      <span class="vanity-roll-sub">gold you cling to buys nothing — gold you squander buys legend (§27)</span></header>
      <p><b>${actor.name}</b> burns <b>${gold} gp</b> in one spectacular blow-out — feasts, statues, scandalous commissions —
      and wakes famous: <b>+${glory} Glory</b> (now ${actor.system.glory}).</p>
      <p><i>And then, the morning after…</i></p>
    </div>`
  });
  const table = await getVanityTable("The Morning After (carousing)");
  if (table) await table.draw({ displayChat: true });
}

/* ---------- dialogs for the new tools ---------- */

function forgeEncounterDialog() {
  new Dialog({
    title: "The Forge — an Encounter",
    content: `<form class="vanity-roll-dialog">
      <div class="form-group"><label>Foe kind</label><select name="kind">
        <option value="">Random</option>
        ${Object.keys(FORGE_MONSTERS).map(t => `<option value="${t}">${t}</option>`).join("")}
      </select></div>
      <div class="form-group"><label>Heat</label><select name="heat">
        <option value="skirmish">Skirmish — mooks and nerves</option>
        <option value="fight" selected>Fight — a proper scrap</option>
        <option value="battle">Battle — a Threat with friends</option>
        <option value="nightmare">Nightmare — a Nemesis</option>
      </select></div>
    </form>`,
    buttons: {
      forge: {
        icon: '<i class="fa-solid fa-hammer"></i>', label: "Forge",
        callback: html => {
          const f = html[0].querySelector("form");
          forgeEncounter({ kind: f.elements.kind.value, heat: f.elements.heat.value });
        }
      }
    },
    default: "forge"
  }).render(true);
}

function forgeStageDialog() {
  new Dialog({
    title: "The Stage — raise a battlemap",
    content: `<form class="vanity-roll-dialog">
      <div class="form-group"><label>Name (blank = fate decides)</label><input type="text" name="name"></div>
      <div class="form-group"><label>Ground</label><select name="type">
        <option value="barrow" selected>Barrow — rooms, doors, torchlight</option>
        <option value="cave">Cave — organic dark</option>
        <option value="fen">Fen — open marsh, daylight</option>
        <option value="village">Village — houses, green, well (daylight)</option>
        <option value="forest">Forest — trees, a path, a clearing (daylight)</option>
      </select></div>
      <div class="form-group"><label>Size</label><select name="size">
        <option value="small">Small (24×16)</option>
        <option value="medium" selected>Medium (30×20)</option>
        <option value="large">Large (38×26)</option>
      </select></div>
      <div class="form-group"><label>Populate with an encounter</label><input type="checkbox" name="populate" checked></div>
      <div class="form-group"><label>…at heat</label><select name="heat">
        <option value="skirmish">Skirmish</option>
        <option value="fight" selected>Fight</option>
        <option value="battle">Battle</option>
        <option value="nightmare">Nightmare</option>
      </select></div>
    </form>`,
    buttons: {
      forge: {
        icon: '<i class="fa-solid fa-map"></i>', label: "Raise the stage",
        callback: html => {
          const f = html[0].querySelector("form");
          forgeStage({
            name: f.elements.name.value.trim(),
            type: f.elements.type.value,
            size: f.elements.size.value,
            populate: f.elements.populate.checked,
            heat: f.elements.heat.value
          });
        }
      }
    },
    default: "forge"
  }).render(true);
}

function carouseDialog() {
  const chars = game.actors.filter(a => a.type === "character");
  new Dialog({
    title: "The Carouse — buy legend with gold",
    content: `<form class="vanity-roll-dialog">
      <div class="form-group"><label>Who's buying?</label><select name="actor">
        ${chars.map(a => `<option value="${a.id}">${a.name} (${a.system.details.coin?.gp ?? 0} gp · Glory ${a.system.glory ?? 0})</option>`).join("")}
      </select></div>
      <div class="form-group"><label>Gold to burn (≈20 gp per Glory)</label><input type="number" name="gold" value="20" step="5" min="0"></div>
      <p class="hint">Spends the coin, awards the Glory, then rolls the Morning After. Vanity always sends the bill.</p>
    </form>`,
    buttons: {
      carouse: {
        icon: '<i class="fa-solid fa-wine-glass"></i>', label: "Pour",
        callback: html => {
          const f = html[0].querySelector("form");
          carouse({ actorId: f.elements.actor.value, gold: parseInt(f.elements.gold.value) || 0 });
        }
      }
    },
    default: "carouse"
  }).render(true);
}

/* -------------------------------------------- */
/*  THE COMMISSION — a one-shot adventure         */
/* -------------------------------------------- */

const COMMISSION_TITLES = [
  ["The Gilded", "The Hollow", "The Borrowed", "The Drowned", "The Crimson", "The Whispering", "The Counterfeit", "The Thrice-Sold", "The Unburied", "The Peacock's"],
  ["Crown", "Reliquary", "Wedding", "Inheritance", "Portrait", "Menagerie", "Funeral", "Masquerade", "Debt", "Songbird", "Mirror", "Testament"]
];

const COMMISSION_PRIZES = [
  "a reliquary said to hold a saint's smile",
  "a portrait that flatters whoever owns it",
  "a circlet last worn at a hanging",
  "a songbird that repeats one dead man's words",
  "a wedding dress sewn with borrowed pearls",
  "a deed to land that is definitely underwater",
  "a mirror that shows you five years younger",
  "an urn of ashes that are the wrong ashes",
  "a chess set carved from a saint's pew",
  "a love letter that would end two houses",
  "a mask worn by the last three usurpers",
  "a bell clapper stolen so a tower stays silent"
];

const COMMISSION_TASKS = [
  "recover {PRIZE} before the next full moon makes it worse",
  "steal back {PRIZE} — quietly, and without admitting it was ever lost",
  "deliver {PRIZE}, sealed, unopened, and unexamined. Especially unexamined",
  "prove {PRIZE} is a forgery without revealing who commissioned the original",
  "bury {PRIZE} properly, in the right grave, this time",
  "escort {PRIZE} to the border and pretend to be robbed on the way",
  "authenticate {PRIZE} in front of witnesses who must not survive being wrong",
  "swap {PRIZE} for a perfect copy before the unveiling",
  "find who really owns {PRIZE} and make the question go away",
  "retrieve {PRIZE} from where the patron very foolishly hid it"
];

const COMMISSION_VILLAIN_MOTIVES = [
  "wants the prize for exactly the reason the patron fears",
  "already has the prize, and is waiting to see who comes",
  "is the patron's sibling, and arguably in the right",
  "was cheated of the prize first — the paperwork agrees",
  "believes the prize is cursed and means to destroy it (it is; they do)",
  "is being paid by the patron's rival — same job, other end",
  "worships what is inside the prize",
  "needs the prize to pay a Reckoning of their own",
  "loved the prize's last owner and will not forgive",
  "is the previous crew, still alive, still owed"
];

const COMMISSION_TWISTS = [
  "The patron is lying about what the prize is.",
  "The prize is cursed, mildly, and contagiously.",
  "Two patrons hired two crews. You are the second.",
  "The villain is right, and everyone important knows it.",
  "The prize must not travel by daylight. Nobody says why.",
  "The patron's payment is itself stolen, and marked.",
  "Whoever holds the prize starts dreaming its owner's dreams.",
  "The prize is heavier every mile it moves from home.",
  "A carousing bard has already put the job in a song.",
  "The real prize is inside the obvious prize.",
  "The patron intends to report it stolen either way.",
  "Someone in the patron's house is the villain's eyes."
];

const COMMISSION_DANGER = {
  cozy:   { heat: "fight",     hoard: "cache", fee: () => 20 + sum(rollDice(2, 6)) * 2, villain: "threat" },
  proper: { heat: "battle",    hoard: "chest", fee: () => 40 + sum(rollDice(3, 6)) * 3, villain: "threat" },
  deadly: { heat: "nightmare", hoard: "vault", fee: () => 80 + sum(rollDice(4, 6)) * 4, villain: "nemesis" }
};

async function forgeAdventure({ danger = "proper", ground = "", raiseStage = true, name = "" } = {}) {
  if (!game.user.isGM) return;
  const cfg = COMMISSION_DANGER[danger] ?? COMMISSION_DANGER.proper;
  name ||= `${rnd(COMMISSION_TITLES[0])} ${rnd(COMMISSION_TITLES[1])}`;
  const type = ["barrow", "cave", "fen"].includes(ground) ? ground : rnd(["barrow", "cave", "fen"]);
  ui.notifications.info(`The Commission: drafting “${name}”…`);

  const folder = await Folder.create({ name: `Commission — ${name}`, type: "Actor" });
  const patron = await forgeFace({ silent: true, folderId: folder.id });
  const kind = rnd(Object.keys(FORGE_MONSTERS));
  const villain = await forgeMonster({ type: kind, menace: cfg.villain, silent: true, folderId: folder.id });

  const prize = rnd(COMMISSION_PRIZES);
  const task = rnd(COMMISSION_TASKS).replace("{PRIZE}", `<b>${prize}</b>`);
  const motive = rnd(COMMISSION_VILLAIN_MOTIVES);
  const twist = rnd(COMMISSION_TWISTS);
  const fee = cfg.fee();

  let scene = null;
  if (raiseStage) scene = await forgeStage({ type, populate: true, heat: cfg.heat, kind });

  const patronLine = patron.system.notes.split("\n")[0] ?? "";
  const overview = `<div class="vanity-journal">
    <h1>${name}</h1>
    <p><i>A one-sitting commission for VANITY — danger: <b>${danger}</b>.</i></p>
    <h2>The Patron</h2>
    <p>@UUID[${patron.uuid}]{${patron.name}} — ${patronLine} ${patron.system.trick}
    <br><b>Wants:</b> ${patron.system.notes.match(/Wants: (.*)/)?.[1] ?? "the job done quietly"}
    <br><b>Secret:</b> <i>${patron.system.notes.match(/Secret: (.*)/)?.[1] ?? "more than one"}</i></p>
    <h2>The Job</h2>
    <p>${task.charAt(0).toUpperCase() + task.slice(1)}. The fee is <b>${fee} gp</b> — half now, half on delivery, all of it beautifully carousable (§27).</p>
    <h2>The Opposition</h2>
    <p>@UUID[${villain.uuid}]{${villain.name}} — a ${kind} who <b>${motive}</b>.
    <br><i>${villain.system.trick}</i></p>
    <h2>The Ground</h2>
    <p>${scene ? `@UUID[${scene.uuid}]{${scene.name}} — raised, walled, lit and populated (${cfg.heat}).` : `A ${type} of the GM's choosing — raise one with The Stage when ready.`}</p>
    <h2>The Twist</h2>
    <p><i>${twist}</i></p>
    <h2>On Site</h2>
    <p>Whatever else is found: the hoard below. And the prize itself, which is worth more than the fee — a fact the table will notice.</p>
  </div>`;

  const journal = await JournalEntry.create({
    name: `Commission — ${name}`,
    pages: [{ name: "The Commission", type: "text", title: { show: false, level: 1 }, text: { format: 1, content: overview } }]
  });

  await ChatMessage.create({
    speaker: { alias: "The Commission" },
    whisper: ChatMessage.getWhisperRecipients("GM"),
    content: `<div class="vanity-roll vanity-forge-card">
      <header><span class="vanity-roll-label">📜 A commission is drafted</span>
      <span class="vanity-roll-sub">${danger} · ${type} · fee ${fee} gp</span></header>
      <p><b>@UUID[${journal.uuid}]{${name}}</b> — patron @UUID[${patron.uuid}]{${patron.name}},
      opposition @UUID[${villain.uuid}]{${villain.name}}${scene ? `, staged at @UUID[${scene.uuid}]{${scene.name}}` : ""}.</p>
      <p><i>${twist}</i></p>
    </div>`
  });
  await forgeHoard({ size: cfg.hoard });
  return { journal, patron, villain, scene };
}

function forgeAdventureDialog() {
  new Dialog({
    title: "The Commission — a one-shot adventure",
    content: `<form class="vanity-roll-dialog">
      <div class="form-group"><label>Title (blank = fate decides)</label><input type="text" name="name"></div>
      <div class="form-group"><label>Danger</label><select name="danger">
        <option value="cozy">Cozy — an evening's trouble</option>
        <option value="proper" selected>Proper — a real job</option>
        <option value="deadly">Deadly — a Nemesis waits</option>
      </select></div>
      <div class="form-group"><label>Ground</label><select name="ground">
        <option value="">Random</option>
        <option value="barrow">Barrow</option>
        <option value="cave">Cave</option>
        <option value="fen">Fen</option>
      </select></div>
      <div class="form-group"><label>Raise the battlemap now</label><input type="checkbox" name="raise" checked></div>
    </form>`,
    buttons: {
      forge: {
        icon: '<i class="fa-solid fa-scroll"></i>', label: "Draft it",
        callback: html => {
          const f = html[0].querySelector("form");
          forgeAdventure({
            name: f.elements.name.value.trim(),
            danger: f.elements.danger.value,
            ground: f.elements.ground.value,
            raiseStage: f.elements.raise.checked
          });
        }
      }
    },
    default: "forge"
  }).render(true);
}

/* -------------------------------------------- */
/*  THE VAIN CROWN — the expanded adventure       */
/*  village → village fight → forest → the barrow */
/* -------------------------------------------- */

const CROWN_NPCS = [
  { name: "Reeve Aldous Pennywhistle", img: "icons/skills/social/diplomacy-handshake-yellow.webp",
    role: "the reeve of Nettlebrook, and your patron",
    line: "Wrings a velvet cap he cannot afford. Wants the barrow sealed before the dead king wakes wearing the crown — and wants it done quietly, for the village's good name.",
    trick: "Offers 40 gp, half now. Secretly hopes you'll bring the crown to HIM." },
  { name: "Goodwife Marrow", img: "icons/skills/social/diplomacy-handshake-blue.webp",
    role: "the innkeeper of the Drowned Duck",
    line: "Knows every rumour in three parishes and will trade them for a listened ear. Saw the grave-robbers ride through at dusk, 'gentry-looking, the pale one especially.'",
    trick: "A free bed and a warning: 'Don't take the open water road. Something's been at the sheep.'" },
  { name: "Brother Cassian", img: "icons/magic/holy/saint-glass-portrait-halo.webp",
    role: "the priest of the very small chapel",
    line: "Old, kind, and quietly terrified. Will bless the party (a Holy water flask each) and beg them to rebury King Aldric properly — 'the boy was vain, not evil.'",
    trick: "Knows the barrow's two-key door needs BOTH a scholar and a thief. Says so, sadly." },
  { name: "The Pale Stranger", img: "icons/magic/death/grave-tombstone-glow-teal.webp",
    role: "Vesper Kound's agent, posing as a pilgrim",
    line: "Too clean, too calm, asks too many questions about the barrow road. This is one of Vesper's people — sent to see who else is hunting the crown.",
    trick: "Reaction roll at −1 die. If rumbled, breaks for the forest road blowing a bone whistle — begins Act Two." }
];

async function makeAdventureNpc(def, folderId) {
  let a = game.actors.getName(def.name);
  if (a) return a;
  return Actor.create({
    name: def.name, type: "npc", img: def.img, folder: folderId,
    system: {
      category: "mook",
      attack1: { name: "Scuffle", pool: 2, note: "villager" }, attack2: { name: "", pool: 0, note: "" },
      defence: { pool: 2, note: "dodge" }, grit: { value: 2, max: 2 }, resolve: { value: 0, max: 0 }, nerve: 2,
      trick: def.trick, notes: `${def.role}.\n${def.line}`
    }
  });
}

async function bestiaryActor(name, folderId, disposition = -1) {
  const existing = game.actors.getName(name);
  if (existing) { await existing.update({ "system.grit.value": existing.system.grit.max }); return existing; }
  const pack = await game.packs.get("vanity.bestiary").getDocuments();
  const src = pack.find(d => d.name === name);
  if (!src) return null;
  const data = src.toObject(); data.folder = folderId;
  return Actor.create(data);
}

async function stageVainCrown() {
  if (!game.user.isGM) return ui.notifications.warn("Only the GM may stage the adventure.");
  ui.notifications.info("The Vain Crown: building the whole road — this takes a minute…");

  const folder = await Folder.create({ name: "The Vain Crown — cast", type: "Actor" }).catch(() => null)
    ?? game.folders.find(f => f.name === "The Vain Crown — cast" && f.type === "Actor");
  const fid = folder?.id ?? null;

  // ---- cast ----
  const npcs = [];
  for (const def of CROWN_NPCS) npcs.push(await makeAdventureNpc(def, fid));
  const mk = (n, disp) => bestiaryActor(n, fid, disp);
  const bandits = []; for (let i = 0; i < 4; i++) bandits.push(await mk("Bandit"));
  const wolf1 = await mk("Dire Wolf");
  const forestWolves = []; for (let i = 0; i < 3; i++) forestWolves.push(await mk("Dire Wolf"));
  const batSwarm = await mk("Bat Swarm");
  const rats = []; for (let i = 0; i < 3; i++) rats.push(await mk("Giant Rat"));
  const skeletons = []; for (let i = 0; i < 6; i++) skeletons.push(await mk("Skeleton"));
  const ghouls = []; for (let i = 0; i < 2; i++) ghouls.push(await mk("Ghoul"));
  const vesper = await mk("Vesper Kound");
  const aldric = await mk("King Aldric, the Vain Corpse");
  const dispo = arr => arr.filter(Boolean).map(a => ({ actorId: a.id, name: a.name, img: a.img, disposition: -1 }));
  const neutral = arr => arr.filter(Boolean).map(a => ({ actorId: a.id, name: a.name, img: a.img, disposition: 0 }));

  // ---- treasure ----
  const gearPack = await game.packs.get("vanity.gear").getDocuments();
  const crown = {
    name: "The Peacock Crown", type: "gear",
    img: "icons/commodities/treasure/crown-gold-satin-gems-red.webp",
    system: { quantity: 1, slots: 1, consumable: false, cost: "priceless",
      description: "<p>A gaudy golden circlet, each point tipped with a peacock-eye gem that seems to <i>watch</i>. Whoever wears it gains a permanent <b>+1 die to Charm</b> — and an unrefusable <b>Vice: Pride</b>, and a standing Bane the GM holds against them. Keeping it, destroying it, or reburying it is the party's final, character-defining choice.</p>" }
  };

  // ---- Act I: the village (daylight, NPCs, no fight) ----
  const village = await forgeStage({ type: "village", size: "large", name: "Nettlebrook", activate: false,
    cast: neutral(npcs) });

  // ---- Act II: the fight in the square (grave-robbers + a wolf) ----
  const square = await forgeStage({ type: "village", size: "medium", name: "Nettlebrook — the Green", activate: false,
    cast: dispo([...bandits, wolf1]) });

  // ---- Act III: the forest road (beasts) ----
  const forest = await forgeStage({ type: "forest", size: "large", name: "The Whispering Wood", activate: false,
    cast: dispo([...forestWolves, batSwarm, ...rats]) });

  // ---- Act IV: the barrow (crypt → throne) ----
  const barrow = await forgeStage({ type: "barrow", size: "large", name: "The Barrow of King Aldric", activate: false,
    cast: dispo([...skeletons, ...ghouls, vesper, aldric]) });

  // hoard for the finale
  await forgeHoard({ size: "vault" });

  // ---- the journal ----
  const scenes = { village, square, forest, barrow };
  const npcLink = a => `@UUID[${a.uuid}]{${a.name}}`;
  const sceneLink = s => `@UUID[${s.uuid}]{${s.name}}`;
  const box = t => `<blockquote><p>${t}</p></blockquote>`;
  const page = (name, html, sort) => ({ name, type: "text", title: { show: true, level: 1 },
    text: { format: 1, content: `<div class="vanity-journal">${html}</div>` }, sort });

  const pages = [
    page("The Vain Crown — the road ahead", `
      <p><i>An expanded one-to-two-session VANITY adventure. The vain boy-king <b>Aldric III</b> was buried a year ago with the <b>Peacock Crown</b>. Now the crown stirs, the dead king will not stay dead, and a grave-robbing sorcerer — <b>Vesper Kound</b> — is already on the road to claim it. It begins, as these things do, in a small village that would very much like the problem to go away.</i></p>
      <h2>The four acts</h2>
      <ul>
        <li><b>Act I — Nettlebrook</b> (${sceneLink(village)}): meet the patron, gather rumours, spot Vesper's agent.</li>
        <li><b>Act II — The Green</b> (${sceneLink(square)}): the whistle blows; grave-robbers and a wolf turn on the village.</li>
        <li><b>Act III — The Whispering Wood</b> (${sceneLink(forest)}): the forest road to the barrow, and what hunts it.</li>
        <li><b>Act IV — The Barrow of King Aldric</b> (${sceneLink(barrow)}): the crypt, the throne, and the crown that admires you back.</li>
      </ul>
      <h2>What is actually happening <span style="font-weight:normal">(GM's truth)</span></h2>
      <p>The crown makes its wearer irresistibly admired, and it has never stopped doing it. A year under a hill admired by nobody has made it <i>hungry</i>, and the hunger has been soaking into the dead king like water into chalk. <b>Aldric is waking because the crown cannot bear to go unwitnessed.</b> That is the whole cosmology, and the game's thesis: vanity is a debt, and someone always collects.</p>
      <p><b>Where Vesper is:</b> one step ahead all evening — at the door while the party is on the green, in the crypt while they are in the wood, at the throne as they come down the stair. A fast party catches him still working the sigil: a different shape of finale, the same heart.</p>
      <p><b>Every map is a live Foundry scene</b> with walls, doors and daylight/fog set; <b>every name is a token already placed.</b> Nudge the tokens where you want them and press play.</p>`, 0),

    page("Act I · Nettlebrook", `
      ${box("<i>Read aloud — arrival:</i> Nettlebrook is three streets, a green, a well, and a chapel the size of a shed. The reeve is waiting on the green in a velvet cap he plainly cannot afford, and he is very glad to see anyone at all carrying a weapon.")}
      <p>Scene: ${sceneLink(village)} — daylight, no fog, freely walkable. Four faces to play:</p>
      <ul>
        <li>${npcLink(npcs[0])} — <i>${CROWN_NPCS[0].role}.</i> ${CROWN_NPCS[0].trick}</li>
        <li>${npcLink(npcs[1])} — <i>${CROWN_NPCS[1].role}.</i> ${CROWN_NPCS[1].trick}</li>
        <li>${npcLink(npcs[2])} — <i>${CROWN_NPCS[2].role}.</i> ${CROWN_NPCS[2].trick}</li>
        <li>${npcLink(npcs[3])} — <i>${CROWN_NPCS[3].role}.</i> ${CROWN_NPCS[3].trick}</li>
      </ul>
      ${box("<i>Read aloud — the reeve's offer:</i> Forty gold. Half now, half when the hill is quiet again. And quietly, if you'd be so kind — Nettlebrook's a good name and I'd like to keep it.")}
      ${box("<i>Read aloud — Brother Cassian, at the chapel door:</i> Put him back properly, that's all I ask. The boy was vain, not evil. There's a difference, and it matters.")}
      <p><b>Running the act.</b> No fail state — the whistle blows whether or not the party earns a thing. Play the faces warm and let people show off: grandstanding is Vanity, and Vanity is what makes Act Four hurt. If the table stalls, move the Stranger.</p>
      <p><b>Rolls that matter:</b> a <b>Reaction</b> (§24) for the Pale Stranger at −1 die; <b>Charm/Command</b> to open the reeve's purse wider; <b>Notice/Lore</b> to realise the 'pilgrim' is nothing of the kind. The moment the party corners the Stranger, they whistle and run — <b>go to Act II.</b></p>
      ${box("<i>Read aloud — the act break:</i> The pilgrim stops mid-sentence and looks at you the way a man looks at a sum he has just finished adding up. Then he runs, and somewhere behind the well-house a bone whistle goes up.")}`, 100),

    page("Act II · The Green", `
      ${box("<i>Read aloud — the whistle:</i> A whistle, then screaming. Vesper left a handful of hard men in the village to keep it frightened — and something worse on a leash. They break cover from the alleys and the well-house, and a villager is already down in the mud.")}
      <p>Scene: ${sceneLink(square)}. <b>Foes:</b> ${bandits.map(npcLink).join(" · ")} and ${npcLink(wolf1)}.</p>
      <ul>
        <li><b>Bandits</b> (attack 3d, leather, Grit 2): flee when half are down or the wolf falls.</li>
        <li><b>Dire Wolf</b> (attack 4d, dodge 4d, Grit 5): <i>Knock Down free on a hit.</i> Vesper's sentry-beast.</li>
        <li><b>The green</b> is cover country — the well, carts, and building corners. Reward <b>Environment</b> maneuvers and grandstanding (Vice bait, +1 Vanity).</li>
      </ul>
      ${box("<i>Read aloud — the wolf comes off the rope:</i> The handler drops the rope rather than be dragged by it. The wolf doesn't charge at once. It picks one of you first, and <i>then</i> it charges.")}
      <p><b>Running the fight.</b> The bandits are debts with faces; <b>the wolf is the fight</b>. Keep saying <i>audience</i> — every window turns a maneuver into a performance and a Stumble into a story; pay Vanity for any risk taken for a bystander. <b>Failure case:</b> if the party is genuinely losing, a villager's roof-tile finishes the wolf and the rest break.</p>
      <p>Take one bandit alive and they'll talk: Vesper rode for the barrow at dawn, by the forest road, 'and good luck to you on it.' <b>Go to Act III.</b></p>`, 200),

    page("Act III · The Whispering Wood", `
      ${box("<i>Read aloud — into the trees:</i> The barrow sits deep in the old wood, and the wood knows it. The path is there for those who can read it; off the path, the trees close ranks and things move that a year of the dead king's dreaming has made bold.")}
      <p>Scene: ${sceneLink(forest)} — daylight, thickets block sight and step, a path winds east to a <b>clearing with the barrow mouth</b>.</p>
      <ul>
        <li><b>Wildcraft / Survive</b> holds the path (a Ranger auto-succeeds; others need 2 Successes or lose an hour and draw the swarm).</li>
        <li><b>Beasts:</b> ${forestWolves.map(npcLink).join(" · ")} — a hunting pack; ${npcLink(batSwarm)} in the deep shade; ${rats.map(npcLink).join(" · ")} boiling from a rotten log.</li>
        <li><b>The fork:</b> where the path bends, a second way runs north over <b>open water</b> — a drowned causeway across the fen, quicker, glittering and completely exposed. That is the road Marrow warned them off in Act I.</li>
        <li><i>Vanity bait:</i> the causeway is faster and watched by the rest of the wolf pack. Staying on the forest road is slower and safer — let pride choose.</li>
      </ul>
      ${box("<i>Read aloud — the wood's warning:</i> The birdsong stops in bands, like you're crossing borders somebody drew. Behind you it starts up again. Ahead of you it doesn't.")}
      <p><b>Running the walk.</b> Pressure, not a maze: a failed roll never means <i>lost forever</i>, it means the lost hour — and the hour is real, because Vesper gets ahead and the party arrives to a door already open. Say the fork's two options plainly, then say nothing; the silence is the test.</p>
      ${box("<i>Read aloud — arrival:</i> The trees simply end. A clearing, a green hill with a stone mouth set in it, and cold air coming out of that mouth on a warm afternoon.")}
      <p>The path ends at the clearing and the dark mouth of the barrow. <b>Go to Act IV.</b></p>`, 300),

    page("Act IV · The Barrow of King Aldric", `
      ${box("<i>Read aloud — the mouth:</i> Cold air breathes out of the hill. Somewhere below, a sorcerer is working, and a dead boy-king is beginning to remember that he was beautiful.")}
      <p>Scene: ${sceneLink(barrow)} — rooms, doors and torchlight; token vision and fog on.</p>
      <h3>The Sealed Door</h3>
      ${box("<i>Read aloud — the threshold:</i> Two men lie at the door. One has a dart through his throat. The other has no mark on him at all — he sat down against the stone and stopped.")}
      <p>The mouth is a slab bound by a glowing <b>arcane sigil</b> (only <b>Arcana</b>, Threshold 2 — failure locks the spell and jolts everyone 2 Grit) <b>and</b> a mundane <b>trapped lock</b> beneath (only <b>Larceny</b> + thieves' tools — a failed roll springs a dart, a Wound). Two keys, two classes.</p>
      <p><b>If a key is down or missing</b> (the Mage Taken Out on the green, no Rogue at the table), the other art may be <i>attempted</i> by a proxy at <b>+1 Threshold</b> using Vesper's dropped notes from a threshold corpse — slower and costlier, never a stonewall. <b>The door never ends the adventure.</b></p>
      <h3>The Crypt of Servants</h3>
      ${box("<i>Read aloud — the niches:</i> The dust in the burial niches shifts. Not all at once — one after another, politely, like a household rising to greet a guest.")}
      <p>${skeletons.map(npcLink).join(" · ")} and ${ghouls.map(npcLink).join(" · ")} rise as the party crosses. The <b>Cleric's Turn Undead</b> sweeps the skeletons; the <b>Ghouls' paralysing claws</b> are the real danger, and the <b>Warrior</b> must hold the choke while the soft classes work.</p>
      <h3>The Peacock Throne</h3>
      ${box("<i>Read aloud — the throne:</i> The crown is in the sorcerer's hands, lifted off a dead brow a heartbeat ago, and it is beginning to shine. On the throne, something that was beautiful once opens its eyes.")}
      <p>${npcLink(vesper)} has beaten the party here and just <b>woken ${npcLink(aldric)} by mistake</b>. Two-sided fight:</p>
      <ul>
        <li><b>Vesper Kound</b> (Necromancer, Grit 6): Firebolt, Sleep, raises fallen Skeletons; parleys or flees if losing — a live villain for later.</li>
        <li><b>King Aldric, the Vain Corpse</b> (<b>Nemesis</b>, Grit 14, Resolve 3): spectral blade ignores armour; <b>Aura of Admiration</b> — look at the crown, resist with Poise or waste your action gazing (<i>cadence: two characters per round, nobody twice in a phase — rolling it for everyone every round stalls the fight</i>); <b>Phase 2 at Grit 7</b> — the crown blazes and he attacks twice. Cap single hits at 4.</li>
      </ul>
      <p><b>Play Aldric slow, beautiful and sad.</b> He does not rage; he <i>poses</i>, adjusting the crown between attacks. Show the spectral blade before you aim it — the first strike passes clean through a raised shield, in front of everyone — then target whoever adores him, never the frail by preference. He gets one line, early, in a voice like a portrait talking. No roll answers it:</p>
      ${box("<i>Read aloud — Aldric:</i> Have you come to look at me?")}
      <p><b>The fight is meant to be won</b>, in five or six rounds. The real finale is the quarter-hour after.</p>
      <h3>The spoils</h3>
      <p>Vesper's grave-loot (the Vault hoard rolled to chat), and — if they dare — <b>The Peacock Crown</b>: a permanent +1 die to Charm, an unrefusable <b>Vice: Pride</b>, and a standing Bane. Keeping it, destroying it, or reburying it beside the boy-king is the note the whole adventure has been playing toward.</p>
      <p><b>Running the choice.</b> Put the crown in the middle of the table and stop narrating; let the silence work before you spend Cassian's plea, the reeve's forty gold or Vesper's collector on it. If anyone reaches for dice: <b>no roll resolves this one.</b></p>
      ${box("<i>Read aloud — the road home:</i> The birds are back in the wood, which is how you know it's over. Or that it thinks it is. In Nettlebrook they'll tell this story wrong within a season — only you know what was offered in the dark under the hill, and what it cost to answer.")}
      <p><b>Rewards:</b> 2–3 Glory each. And whatever the crown costs.</p>`, 400)
  ];

  const journal = await JournalEntry.create({
    name: "The Vain Crown — Expanded", img: "icons/commodities/treasure/crown-gold-satin-gems-red.webp",
    pages
  });

  // drop the crown into the barrow scene as a note/loot reminder isn't needed; announce
  await village.activate();
  await ChatMessage.create({
    speaker: { alias: "The Vain Crown" }, whisper: ChatMessage.getWhisperRecipients("GM"),
    content: `<div class="vanity-roll vanity-forge-card">
      <header><span class="vanity-roll-label">👑 The Vain Crown is staged</span>
      <span class="vanity-roll-sub">4 scenes · ${npcs.length + bandits.length + 1 + forestWolves.length + 1 + rats.length + skeletons.length + ghouls.length + 2} tokens placed · full journal</span></header>
      <p>Read @UUID[${journal.uuid}]{The Vain Crown — Expanded}. Scenes: ${sceneLink(village)} → ${sceneLink(square)} → ${sceneLink(forest)} → ${sceneLink(barrow)}.</p>
      <p><b>Nettlebrook</b> is active and waiting. Break a leg — gloriously.</p>
    </div>`
  });
  return { journal, scenes };
}
