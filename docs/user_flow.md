# The Player Journey: User Flow

Here is the step-by-step flowchart of the player's experience, updated to reflect the new PvE lock and anti-smurfing mechanics.

```mermaid
graph TD
    classDef start fill:#1e1e1e,stroke:#fff,stroke-width:2px;
    classDef phase fill:#2c3e50,stroke:#3498db,stroke-width:2px,color:#fff;
    classDef action fill:#27ae60,stroke:#2ecc71,stroke-width:1px;
    classDef risk fill:#c0392b,stroke:#e74c3c,stroke-width:1px;
    classDef utility fill:#8e44ad,stroke:#9b59b6,stroke-width:1px;

    A[Player Registers Account]:::start --> B(Avatar Creation)
    
    subgraph Onboarding Phase
        B -->|Places 1st '4'| C[RNG Places 2nd '4' & Digits]
        C --> D[Enter Tutorial Map]
        D -->|Fight 6 NPCs| E[Learn Rules: Same/Plus/Combo]
        E -->|Safe Matches| F[Draft 6 Starter Cards]
    end

    F -->|Inventory Reaches 7| G(((The Local Region))):::phase
    
    subgraph The PvE Grind (Anti-Smurf Phase)
        G --> H{Avatar Level < 10?}
        H -- YES --> I[Forced to play PvE Map Nodes with Energy]
        I --> M[Gain XP & Level Up]
        I --> N[Gain Gold Currency]
    end

    subgraph The Core Game Loop (Unlocked)
        H -- NO --> J[Unlock PvP Turf War & Private Matches]:::risk
        J -->|Match -1 to +1 Rank| K[Forced Regional Rules]
        K -->|Win fair and square| L[Take Opponent's Card]
        K -->|Lose| O[Card is Taken -> Track via Nemesis]
        
        H -- NO --> P[Asynchronous World Boss Events]:::utility
    end

    subgraph The Economy & Edge Cases
        O -.-> R[Open Vengeance Tracker]:::utility
        R -->|Challenge New Owner| S[Lobby Rematch]
        
        L -.->|Inventory Drops < 7| T[Bankruptcy State]:::risk
        T --> U[Go to Mercenary Node or Scavenge Box]
        U -->|Regain Trash Cards| G
        
        N -->|Spend Gold on Airship Ticket| V[Airship Menu]:::utility
        V -->|Teleport across globe| W[Aviation Flight Time Cooldown Lock in New Region]
    end

    subgraph The Endgame
        M -.->|Avatar at Max Stats| X[Prestige Avatar Menu]:::utility
        X -->|Reset to 4/4| Y[Earn Global Prestige Name Badge]
        
        G --> Z{End of the Week}
        Z -.->|Number 1 Rank| AA[Crown New Regional Ruler]
        AA --> BB[Ruler Abolishes/Adds 1 Rule to Zone]
    end
```
