# Feature: Energy resource (v0.1)

## Goal
The character has an "energy" resource that gates actions and regenerates passively over time, calculated server-side — this is the foundational time-based mechanic everything else (expeditions, training) builds on.

## Business rules
- Maximum energy: 100 for v0.1 (raising the cap via training is a later version — out of scope here)
- Regeneration rate: +1 energy per 60 seconds, calculated from elapsed real time, not from a client-driven timer
- Regeneration is calculated **on read** (when the client requests character state) based on `lastEnergyUpdate`, not via a constantly-running background process — simpler for v0.1, revisit if it doesn't scale
- Energy never exceeds the maximum — regeneration effectively "caps out" and further elapsed time beyond full is not banked
- Any action with an energy cost is rejected server-side if the character doesn't have enough, regardless of what the client believes the current value is

## Data (sketch)
```
Character (extends the record from 02-character-creation.md)
  currentEnergy: int
  maxEnergy: int
  lastEnergyUpdate: timestamp
```

## Endpoints (sketch)
- `GET /characters/me/state` — returns current character state, with energy recalculated in-flight based on `lastEnergyUpdate` (does not require a separate "tick" endpoint)
- Any endpoint that spends energy (e.g. starting an expedition, once that exists) recalculates current energy first, then validates the cost, then persists the new value and updates `lastEnergyUpdate`

## Edge cases to handle
- Character hasn't logged in for days → energy correctly caps at `maxEnergy`, doesn't "overflow" or keep accumulating
- Two concurrent requests spend energy at the same time → must not allow energy to go negative (wrap the check-and-spend in a transaction / use a DB-level constraint, not just an application-level check)
- Client clock/timezone is irrelevant — only server time and `lastEnergyUpdate` matter
- Spending exactly the remaining energy (edge value, not just "not enough") should succeed

## Tests to write
- Unit: the energy-recalculation function given various elapsed times, including "already at max" and "way overdue"
- Unit: an action is rejected when energy cost exceeds current energy
- Integration: concurrent spend requests don't drive energy below zero