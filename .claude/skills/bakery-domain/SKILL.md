---
name: bakery-domain
description: Domain knowledge for artisan/sourdough baking science and math. Claude invokes this automatically when working on formula calculations, recipe scaling, DDT calculator, AI prompt engineering for baking, hydration analysis, preferment ratios, or any feature where baking concepts drive the logic. Use this skill any time baking math or terminology would affect correctness — don't guess at standard ranges or formulas.
user-invocable: false
---

# BakeryOS Baking Domain Reference

Apply this reference when implementing or prompting around formula calculations, the DDT calculator, recipe scaling, or any baking-science AI feature.

All math below is verified. Formulas marked **[app]** reflect what the BakeryOS codebase actually implements; formulas marked **[standard]** reflect textbook baker convention. Where they differ, both are noted.

---

## Baker's Percentages

**Definition:** Every ingredient weight is expressed as a percentage of the *total flour weight*. Flour(s) always sum to exactly 100%.

```
ingredient_pct = (ingredient_weight / total_flour_weight) × 100
```

**BakeryOS convention (from `types.ts`):**
- `flours[]` contains all dry grain ingredients — must sum to 100%
- `ingredients[]` contains everything else (water, levain, salt, add-ins, etc.)
- Levain/starter lives in `ingredients[]`, NOT `flours[]` — its internal flour is not counted in the flour total
- `Ingredient.percentage` is always a Baker's percentage relative to total flour weight
- If only percentages are given, assume `total_flour_weight = 1000g`

**Worked example** (1000g flour):

| Ingredient | % | Weight |
|---|---|---|
| Bread Flour | 80% | 800g |
| Whole Wheat | 20% | 200g |
| **Flour total** | **100%** | **1000g** |
| Water | 72% | 720g |
| Levain | 20% | 200g |
| Salt | 2% | 20g |
| **Total dough** | **194%** | **1940g** |

**Shortcut:** `total_dough_weight = flour_weight × (1 + sum_of_non_flour_pcts / 100)`

---

## Hydration

### Stated Hydration
The water percentage as written in the recipe — does not account for water inside the levain.

```
stated_hydration_pct = (direct_water_weight / total_flour_weight) × 100
```

### Effective (True) Hydration
Accounts for all water in the dough, including water inside the levain.

```
water_in_levain = levain_weight × (levain_hydration_pct / (100 + levain_hydration_pct))
flour_in_levain = levain_weight - water_in_levain

effective_hydration_pct = (direct_water + water_in_levain) / stated_flour_weight × 100
```

**Worked example** (1000g flour, 200g levain at 100% hydration, 720g water):
- Water in levain = 200 × (100/200) = 100g
- Effective hydration = (720 + 100) / 1000 × 100 = **82%** (stated: 72%)

**Stiff levain example** (200g at 75% hydration):
- Water in levain = 200 × (75/175) = 85.7g
- Effective hydration = (720 + 85.7) / 1000 × 100 = **80.6%**

### Hydration → Dough Character Guide

| Hydration | Character | Typical Uses |
|---|---|---|
| 55–65% | Very firm | Bagels, pretzels, some enriched |
| 65–72% | Standard | Pain de mie, sandwich loaves |
| 72–78% | Moderate-slack | Country sourdough, batards |
| 78–85% | High hydration | Open-crumb sourdough, ciabatta |
| 85%+ | Very slack | Focaccia, pan loaves |

---

## Pre-Fermented Flour (PFF)

The fraction of total flour that has already fermented (lives inside the levain/preferment).

```
pff_pct = flour_in_levain / stated_total_flour × 100
```

**Typical ranges:**
- Sourdough with 100% hydration levain: 8–15% PFF is common
- Sourdough with stiff levain (50–65% hydration): 15–25% PFF
- Poolish or biga: typically 20–40% PFF

**BakeryOS example** (20% levain at 100% hydration, 1000g flour):
- Flour in levain = 100g
- PFF = 100 / 1000 × 100 = **10%**

More levain → faster fermentation, more sour flavor. More PFF → shorter bulk at a given temp.

---

## Desired Dough Temperature (DDT)

The target temperature of the mixed dough. Controls fermentation rate. Optimal range for sourdough: **24–27°C (75–80°F)**.

### App Formula (`DDTCalculator.tsx`)

```
water_temp = (DDT × 3) - airTemp - flourTemp - starterTemp - frictionFactor
```

The app uses `× 3` as the multiplier and subtracts 4 terms (air, flour, starter, friction). This is the convention the DDTCalculator component implements.

### Standard Textbook Formula

**Direct dough** (no preferment):
```
water_temp = (DDT × 3) - roomTemp - flourTemp - frictionFactor
```

**With preferment** (levain, poolish, biga):
```
water_temp = (DDT × 4) - roomTemp - flourTemp - prefermentTemp - frictionFactor
```

The `× 4` version multiplies by the count of temperature inputs (room, flour, water, preferment), with friction subtracted separately.

### Friction Factors (temperature rise from mixing)

| Mixing method | Friction factor |
|---|---|
| Hand mixing / folding | 1–4°C (2–7°F) |
| Slow spiral mixer | 4–6°C (7–11°F) |
| Fast spiral mixer | 8–14°C (14–25°F) |
| Fork mixer | 3–5°C (5–9°F) |

### Worked example (app formula)
DDT = 24°C, air = 22°C, flour = 21°C, starter = 22°C, friction = 5°C
```
water_temp = (24 × 3) - 22 - 21 - 22 - 5 = 72 - 70 = 2°C
```
This needs very cold or iced water.

---

## Ice Water Calculation

When the required water temperature is below tap temperature, use ice. Formula derived from heat balance (latent heat of fusion = 80 cal/g):

```
ice_weight = total_water_weight × (tap_temp - target_water_temp) / (tap_temp + 80)
liquid_water_weight = total_water_weight - ice_weight
```

**Worked example** (700g total water, tap = 20°C, need = 4°C):
```
ice = 700 × (20 - 4) / (20 + 80) = 700 × 16 / 100 = 112g ice
liquid = 700 - 112 = 588g tap water
```

Heat balance verify: 588g × 16°C = 9408 cal released = 112g × 80 + 112g × 4 = 9408 cal absorbed ✓

> **Note:** If `target_water_temp ≤ 0°C`, use all ice. If `tap_temp ≤ target_water_temp`, no ice needed.

---

## Bake Loss

Moisture and gas lost during baking. Used to back-calculate pre-bake dough piece weight from a target finished weight.

```
pre_bake_weight = target_finished_weight / (1 - bake_loss_pct / 100)
bake_loss_pct = (pre_bake - finished) / pre_bake × 100
```

**Typical ranges:**

| Bread type | Bake loss |
|---|---|
| Sourdough boule / batard | 10–15% |
| Sandwich loaf (covered tin) | 8–12% |
| Baguette / lean bread | 18–25% |
| Enriched (brioche, etc.) | 8–12% |

**Worked example** (target 800g loaf, 13% bake loss):
```
pre_bake = 800 / (1 - 0.13) = 800 / 0.87 = 919.5g ≈ 920g
```

---

## Scaling

Scale any recipe up or down by applying a uniform factor to all ingredient weights. Percentages never change when scaling.

```
scale_factor = desired_flour_weight / current_flour_weight
           OR = desired_loaf_count / current_loaf_count
           OR = desired_total_dough_weight / current_total_dough_weight

new_ingredient_weight = original_weight × scale_factor
```

**Important:** Only weights scale. Percentages, hydration, DDT, and fermentation times are unchanged by scaling.

**Worked example** (scale from 1 to 6 loaves, original 500g flour):
```
scale_factor = 6 / 1 = 6
New flour: 500 × 6 = 3000g
New water (75%): 375 × 6 = 2250g
New salt (2%): 10 × 6 = 60g
```

---

## Salt

Salt controls fermentation rate, flavor, and gluten strength.

| Role | Effect |
|---|---|
| Fermentation | Slows yeast/bacteria activity; too little → over-fermentation |
| Flavor | Below 1.5% → bland; above 2.5% → noticeably salty |
| Gluten | Tightens gluten network; improves dough strength |

**Typical ranges:**
- Standard sourdough: **1.8–2.2%** (2% is the common default)
- Lower salt enriched breads: 1.5–1.8%
- Pretzel dough: 1.2–1.5% (high salt in bath, low in dough)

---

## Levain & Starter

### Common Feed Ratios (starter : flour : water by weight)
| Ratio | Result | Timing at 24°C |
|---|---|---|
| 1:1:1 | Quick, active | Peak in 4–6h |
| 1:2:2 | Moderate | Peak in 6–8h |
| 1:5:5 | Slow, mild | Peak in 10–14h |
| 1:10:10 | Overnight | Peak in 14–18h |

### Ripeness Indicators
- **Float test:** Drop ~1 tsp levain in water — floats = ready (CO₂-filled structure)
- **Volume:** 50–100% rise from peak activity (varies by flour and hydration)
- **Aroma:** Tangy/yogurt-like = ready; very sharp/vinegary = past peak (over-fermented)
- **Dome:** Levain at peak has a slightly domed top; past peak shows concave/deflated surface

### Common Levain Hydrations
| Type | Hydration | Character |
|---|---|---|
| Liquid levain | 100–125% | Fast, active, mild acidity |
| Semi-stiff | 65–80% | Balanced |
| Stiff levain (lievito madre) | 45–65% | Slow, less sour, more complex |

---

## Fermentation Temperature Guide

| Stage | Temp | Notes |
|---|---|---|
| Bulk fermentation (ambient) | 24–27°C (75–80°F) | Warmer = faster; target 50–75% rise |
| Cold bulk retard | 4–8°C (39–46°F) | Slows fermentation, develops flavor |
| Final proof (ambient) | 24–27°C | 2–4h typical |
| Cold final proof | 2–4°C (36–39°F) | 8–16h; scored straight from fridge |
| Bake (Dutch oven) | 230–260°C (450–500°F) | Lid on first 20 min for steam/oven spring |

**Rule of thumb:** Fermentation time roughly **halves for every +5°C (9°F)** increase in temperature.

---

## Autolyse

A pre-mix rest of flour and water (no salt, no levain) that develops gluten without mechanical work.

- **Duration:** 20–60 min (longer for whole grain or high-extraction flours)
- **Effect:** Reduces mixing time, improves extensibility, can improve crumb openness
- **Salt exclusion:** Salt tightens gluten and slows hydration — always added after autolyse
- **Levain timing:** Some bakers exclude levain from autolyse (true autolyse); some include it (bassinage)

---

## Common Sourdough Formula Ranges (Sanity Check)

Use these to flag likely errors in AI-generated or user-entered formulas:

| Parameter | Normal range | Flag if outside |
|---|---|---|
| Hydration | 60–95% | < 55% or > 100% |
| Salt | 1.5–2.5% | < 1% or > 3% |
| Levain | 10–30% | < 5% or > 50% |
| Single flour dominance | 50–100% of flour total | — |
| Whole grain addition | 10–40% of flour | > 60% (handling issues) |
| PFF | 5–25% | > 40% (over-fermentation risk) |

---

## Ingredient Density Reference

For volume → weight conversions (also encoded in `NORMALIZATION_INSTRUCTIONS` in `claudeService.ts`):

| Ingredient | 1 cup | 1 tbsp | 1 tsp |
|---|---|---|---|
| Bread / AP flour | 125g | 8g | — |
| Water / liquid | 240g | 15g | 5g |
| Fine salt | — | 18g | 6g |
| Granulated sugar | 200g | 12g | 4g |
| Honey / syrup | 340g | 21g | 7g |
| Butter | 227g | 14g | — |
| Instant yeast | — | 9g | 3g |
