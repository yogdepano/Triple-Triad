# Final Fantasy: Triple Triad Online Clone

A direct web-based clone of the classic Triple Triad game featuring characters from all Final Fantasy series, competitive high-stakes multiplayer, a Slay the Spire visual aesthetic, and a robust PvE map system.

## Core Design Solutions

### 1. Global Airship Travel & Turf Wars
*   **Virtual Geography (No GPS):** The map is divided into real-world geographic Zones/Cities. Players manually travel to Zones to fight in that specific region's lobby.
*   **The Travel Economy:** Traveling is not free. Players earn Gold by defeating PvE NPCs. This Gold is strictly used to purchase "Airship Tickets" to fly between regions.
*   **Real-Time Location Locks:** Traveling between borders triggers a hard "Location Lock" based on the realistic average of commercial aviation flight times (e.g., flying trans-Pacific locks you into your destination for ~14 hours, while intra-Europe flights are shorter). When you arrive, you can play locally immediately, but you cannot fly again until the cooldown expires.

### 2. The Contagion & Regional Rules
*   Every Zone has default Rules. Matches played in that Zone force those rules upon both players.
*   **The Infection Rule:** If a foreign player travels to a new Zone and successfully dethrones the reigning Champion, they can "infect" the city, transferring a rule from their home region.

### 3. Avatar Progression & Prestige System
*   **Initial Creation:** Given two `4`s to place. RNG fills the rest.
*   **Endgame Prestige System:** Avatar stats are capped at two `A`s. Handled via resetting stats for permanent Prestige Badges.

### 4. Competitive Integrity, Anti-Smurfing & Matchmaking
*   **The Anti-Smurf Gate (PvE First):** To prevent players from aggressively creating multiple alt accounts ("smurfing") to farm the tutorial for free cards or funnel Avatar XP to their main account, the PvP Zone and Private Sessions are strictly level-gated. A new player must grind PvE using Daily Energy until they reach a requisite Level (e.g., Level 10) before they are allowed to interact with the multiplayer economy. 
*   **RNG Initiative:** Pure RNG coin flip determines who plays the first card.
*   **Global Tracking:** Avatars are won fair and square. If your Avatar is **Taken** (not "stolen"), you can track exactly who currently holds it using the Nemesis Tracker and challenge them to win it back.
*   **The "Hover to Reveal" Jammer:** The UI defeats AI cheating bots by requiring users to physically hover their mouse over a card to reveal its stats, preventing full-board screenshots.

### 5. The Dual Raid Systems
*   **The World Boss:** Solo instances dealing global Server HP damage for Milestone chests.
*   **The Grand Raid:** A massive 7x7 grid. 12 players cooperatively battle a boss controlling 25 cards.

### 6. The Economy & Zero Pay-to-Win
*   **No P2W:** The Energy system gates matches. Energy and Gold cannot be purchased with real money. 
*   **The Free-to-Play Milestone Gacha:** Hitting gameplay milestones rewards Treasure Chests containing exclusive "Chest-Only" cards.
