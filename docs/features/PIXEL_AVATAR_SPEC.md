# Pixel Art Charakter-System - Feature Specification

**Feature ID:** `pixel-avatar-system`
**Status:** Design Phase
**Priority:** Medium
**Effort Estimate:** Large (3-5 days)

---

## 1. Product Vision

**User Story:**
> Als Projekt L User möchte ich meinen eigenen Pixel-Art Charakter erstellen und anpassen können, damit ich eine visuelle Repräsentation meines RPG-Charakters habe.

**Success Metrics:**
- ✅ User kann innerhalb 2 Minuten einen Charakter erstellen
- ✅ Mindestens 100+ mögliche Kombinationen (Haare × Kleidung × ...)
- ✅ Charakter spiegelt RPG-Stats wider (Level, Equipment, Faction)

---

## 2. Functional Requirements

### 2.1 MVP Features (Phase 1)

#### Character Editor
- [ ] Frei erstellbarer Charakter
- [ ] Anpassbare Elemente:
  - Haare (5+ Styles, 10+ Farben)
  - Gesicht (3+ Expressions)
  - Kleidung/Oberteil (5+ Styles)
  - Hose (3+ Styles)
  - Schuhe (3+ Styles)
- [ ] Real-time Preview
- [ ] Save/Load Character Config

#### Character Display
- [ ] Dashboard: Charakter-Avatar (64x64px oder 128x128px)
- [ ] Hover: Zeige Character Stats (Level, XP, etc.)
- [ ] Click: Öffne Character Editor

### 2.2 Future Features (Phase 2+)

- [ ] Level-basierte Veränderungen (Charakter wird epischer bei höherem Level)
- [ ] Equipment basierend auf Skills (z.B. Laptop für Coding-Skills)
- [ ] Idle Animations (Breathing, Blinking)
- [ ] Faction-based Outfits (Karriere = Business Suit, Koerper = Gym Wear)
- [ ] Achievement Badges as Accessories

---

## 3. Technical Design

### 3.1 Technology Stack Decision

**Options Evaluated:**

| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| **HTML Canvas** | Native, lightweight | Manual sprite management | ❌ Too low-level |
| **PixiJS** | Fast WebGL, sprite sheets, filters | Learning curve | ✅ **SELECTED** |
| **Phaser** | Full game framework | Overkill for static avatar | ❌ Too heavy |
| **CSS Sprites** | Simple, no JS needed | Limited animation | ❌ Not flexible enough |

**Selected:** **PixiJS v8** (`/llmstxt/pixijs_llms_txt`)
- Fastest 2D rendering library
- Excellent sprite sheet support
- WebGL acceleration
- React integration available

### 3.2 Data Model

#### Character Configuration
```typescript
// src/lib/database.types.ts
export interface CharacterAvatar {
  // Base
  bodyType: 'slim' | 'average' | 'muscular';
  skinTone: string; // Hex color

  // Head
  hairStyle: 'short' | 'long' | 'curly' | 'bald' | 'pixie';
  hairColor: string; // Hex color
  facialHair?: 'none' | 'beard' | 'mustache' | 'goatee';
  expression: 'neutral' | 'happy' | 'focused' | 'tired';

  // Clothing
  topStyle: 'tshirt' | 'hoodie' | 'suit' | 'tank' | 'dress';
  topColor: string;
  bottomStyle: 'jeans' | 'shorts' | 'suit-pants' | 'skirt';
  bottomColor: string;
  shoesStyle: 'sneakers' | 'boots' | 'sandals' | 'dress-shoes';

  // Accessories (future)
  accessories?: {
    glasses?: 'none' | 'round' | 'square' | 'sunglasses';
    hat?: 'none' | 'cap' | 'beanie';
    badge?: string; // Achievement ID
  };
}
```

#### Database Schema
```sql
-- Migration: Add character_avatar to user_profiles
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS character_avatar JSONB DEFAULT NULL;

COMMENT ON COLUMN user_profiles.character_avatar IS
  'Pixel art character customization config (hair, clothes, etc.)';
```

### 3.3 Component Architecture

```
src/components/character/
├── CharacterAvatar.tsx       # Display component (dashboard)
├── CharacterEditor.tsx       # Full editor modal
├── CharacterRenderer.tsx     # PixiJS canvas wrapper
├── AvatarPreview.tsx         # Small preview (settings)
└── presets/
    ├── defaultAvatar.ts      # Default config
    └── presetAvatars.ts      # Quick-select templates
```

### 3.4 Asset Management

**Approach:** Sprite Sheets (PNG)

```
public/assets/character/
├── body/
│   ├── slim.png
│   ├── average.png
│   └── muscular.png
├── hair/
│   ├── short.png
│   ├── long.png
│   └── ...
├── clothes/
│   ├── tshirt.png
│   ├── hoodie.png
│   └── ...
└── spritesheet.json  # Texture atlas metadata
```

**Alternatives:**
1. **Option A:** Hand-drawn sprites (Manual, high quality)
2. **Option B:** Procedural generation (Algorithmic, flexible)
3. **Option C:** Use existing asset pack (Fast, limited customization)

**Recommendation:** Start with **Option C** (asset pack), migrate to **Option A** later
- Asset Pack: [Pixel Art Character Base by Ansimuz](https://ansimuz.itch.io/) or similar
- License: Check CC0/MIT compatible packs

---

## 4. Implementation Plan

### Phase 1: Basic Editor (Week 1)

**Tasks:**
1. [ ] Install PixiJS (`npm install pixi.js @pixi/react`)
2. [ ] Create CharacterRenderer component with PixiJS canvas
3. [ ] Find/license pixel art asset pack
4. [ ] Create sprite sheet from assets
5. [ ] Implement layer compositing (body + hair + clothes)
6. [ ] Add color tinting support
7. [ ] Create CharacterEditor UI (dropdowns, color pickers)
8. [ ] Save avatar config to `user_profiles.character_avatar`

**Acceptance Criteria:**
- ✅ User can customize hair, clothes, colors
- ✅ Changes reflect in real-time preview
- ✅ Config persists in database

### Phase 2: Dashboard Integration (Week 1-2)

**Tasks:**
1. [ ] Add CharacterAvatar component to Dashboard header
2. [ ] Load avatar config from user profile
3. [ ] Render 64x64px version on dashboard
4. [ ] Click → Open CharacterEditor modal
5. [ ] Add "Customize Character" button to settings

**Acceptance Criteria:**
- ✅ Avatar visible on dashboard
- ✅ Editor accessible from dashboard + settings
- ✅ Changes save and persist across sessions

### Phase 3: RPG Integration (Week 2-3)

**Tasks:**
1. [ ] Auto-select outfit based on highest Faction
2. [ ] Add level-based visual upgrades (e.g., glow effect at Level 50+)
3. [ ] Equipment system: Show laptop for Coding skills
4. [ ] Achievement badges as accessories
5. [ ] Idle animations (breathing, blinking)

**Acceptance Criteria:**
- ✅ Faction outfit auto-applied
- ✅ Level 50+ characters have visual enhancement
- ✅ Skills influence displayed equipment

---

## 5. Open Questions (For Product Owner)

### 5.1 Asset Creation

**Q1:** Sollen wir einen bestehenden Asset Pack verwenden oder Custom-Sprites erstellen?
- **Option A:** Asset Pack (schnell, eingeschränkt)
- **Option B:** Custom (langsam, unique)

**Empfehlung:** Start with Asset Pack, commission custom sprites later

### 5.2 Customization Depth

**Q2:** Wie detailliert soll die Anpassung sein?
- **Option A:** Basic (5 Hair × 5 Clothes = 25 Combos)
- **Option B:** Moderate (10 × 10 × 5 Colors = 500 Combos)
- **Option C:** Deep (20 × 20 × 20 Colors × Accessories = 100k+ Combos)

**Empfehlung:** Option B (Moderate) – Sweet spot zwischen Aufwand und Flexibilität

### 5.3 Animation Scope

**Q3:** Sollen Charaktere animiert sein?
- **Option A:** Static (einfach, weniger Assets)
- **Option B:** Idle Animations (breathing)
- **Option C:** Full Animations (walk, jump, celebrate)

**Empfehlung:** Start with Static (Phase 1), add Idle later (Phase 2)

### 5.4 Integration Priority

**Q4:** Wo soll der Avatar überall erscheinen?
- [ ] Dashboard Header (MUST)
- [ ] Profile/Settings Page (MUST)
- [ ] Activity Log Entries (NICE)
- [ ] Leaderboards (NICE)
- [ ] Quest Completion Screens (NICE)

**Empfehlung:** Start with Dashboard + Settings only

---

## 6. Technical Challenges & Risks

### 6.1 Performance

**Challenge:** PixiJS Canvas in Next.js SSR
- **Risk:** Canvas requires client-side rendering
- **Mitigation:** Use `'use client'` directive, lazy load PixiJS

### 6.2 Asset Size

**Challenge:** Sprite sheets can be large (2-5 MB)
- **Risk:** Slow initial load
- **Mitigation:**
  - Lazy load editor assets
  - Use WebP format for sprites
  - CDN caching

### 6.3 Color Customization

**Challenge:** Recoloring sprites at runtime
- **Risk:** Performance overhead
- **Mitigation:** Use PixiJS color filters (GPU-accelerated)

---

## 7. Success Criteria

### Definition of Done (Phase 1)

- [ ] User can create & save custom character
- [ ] Character displays on dashboard (64x64)
- [ ] Minimum 25 unique combinations possible
- [ ] Load time < 1s for avatar render
- [ ] Works on mobile + desktop
- [ ] Accessible (keyboard navigation in editor)

### KPIs to Track

- % of users who customize their avatar (Target: 60%)
- Average time spent in editor (Target: 3-5 min)
- Number of avatar changes per user (Target: 2-3 times/month)

---

## 8. Alternative Approaches Considered

### Approach 1: AI-Generated Avatars
- **Pro:** Unique for each user
- **Con:** Unpredictable results, no user control
- **Verdict:** ❌ Rejected – User agency is core

### Approach 2: 3D Avatars (Three.js)
- **Pro:** More immersive
- **Con:** Much higher complexity
- **Verdict:** ❌ Overkill for MVP

### Approach 3: Simple Profile Picture Upload
- **Pro:** Simplest implementation
- **Con:** Doesn't feel game-like
- **Verdict:** ❌ Doesn't fit RPG theme

---

## 9. Dependencies

### External Libraries
- `pixi.js` – 2D rendering engine
- `@pixi/react` – React bindings (optional)
- `colord` – Color manipulation

### Asset Requirements
- Pixel art sprite pack (CC0 or licensed)
- OR: Commission custom sprites (Budget: $200-500)

### Database Changes
- Migration: Add `character_avatar JSONB` to `user_profiles`

---

## 10. Next Steps

### Immediate Actions (Worker 4)

**BEFORE implementing:**
1. ⏸️ **WAIT for Product Owner approval** on:
   - Asset pack vs custom sprites
   - Customization depth (Basic/Moderate/Deep)
   - Animation scope (Static/Idle/Full)
2. Research & license pixel art asset pack
3. Create PixiJS proof-of-concept

**IF approved:**
1. Create feature branch: `feature/pixel-avatar-system`
2. Implement Phase 1 (Basic Editor)
3. Test on multiple devices
4. Submit PR for review

---

**Last Updated:** 2026-01-10
**Author:** Worker 4 (Claude)
**Status:** Awaiting Product Owner Feedback
