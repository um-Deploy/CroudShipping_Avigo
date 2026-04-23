# 📦 Avigo Rideshare Parcel Pricing Engine
This document dictates the complete end-to-end pricing structure integrated directly into the `AvigoBackends` microservices as a dynamic "Rideshare Parcel" (spare space sharing) operation.

---

## 1. Core Principles
The engine relies on three major inputs configured globally via the `PricingConfig` MongoDB model:
1. **Distance Bucket** *(Base Fare)*
2. **Chargeable Weight Slab** *(Space pricing)*
3. **Delivery Speed** *(Speed upcharge)*

*(All metrics measure in `Kilograms (kg)` and `Centimeters (cm)`).*

---

## 2. Calculation Flowchart

```mermaid
flowchart TD
    Start([User Inputs Coordinates & Parcel Info]) --> B(Mapbox API gets route distance)
    B --> C{Are Pickup & Drop Cities Exactly the Same?}
    
    C -- Yes --> D["Distance: 'same_city' (Base: ₹79)"]
    C -- No --> E{Check Distance Range}
    
    E -- "≤ 50km"   --> F["Distance: 'local' (Base: ₹99)"]
    E -- "≤ 200km"  --> G["Distance: 'short' (Base: ₹129)"]
    E -- "≤ 600km"  --> H["Distance: 'medium' (Base: ₹149)"]
    E -- "> 600km"  --> I["Distance: 'long' (Base: ₹199)"]

    D & F & G & H & I --> J[Calculate Volumetric Weight]
    
    J -- "(L × B × H) / 5000" --> K[Calculate Chargeable Weight]
    K -- "Max(Volumetric, Dead Weight)" --> L{Find Weight Slab}

    L -- "≤ 0.5 kg" --> M[+ ₹0]
    L -- "≤ 1.0 kg" --> N[+ ₹50]
    L -- "≤ 2.0 kg" --> O[+ ₹100]
    L -- "≤ 4.0 kg" --> P[+ ₹200]
    L -- "≤ 8.0 kg" --> Q[+ ₹300]
    L -- "> 8.0 kg" --> R[+ ₹450 (Capped)]

    M & N & O & P & Q & R --> S[Add Delivery Speed Upcharge]
    
    S -- "Standard" --> T[+ ₹0]
    S -- "Express"  --> U[+ ₹50]
    S -- "Same Day" --> V{Is Distance 'long'?}
    
    V -- Yes --> W([❌ Reject Booking])
    V -- No --> X[+ ₹100]
    
    T & U & X --> Y[Apply Surge Multipliers]
    Y --> Z[Compute Platform Fees & GST]
    Z --> End([Return Final Estimated Price])
```

---

## 3. Detailed Logic Breakdown

### A. Distance Categorization & Base Prices
Instead of raw continuous pricing (e.g. ₹10/km) and fuel prices, distance spans form "Bucket" buckets dictating base costs:
* `Same City` *(Checked via strings matching exactly)*: **₹79**
* `Local` *(≤ 50 km)*: **₹99**
* `Short` *(50 km – 200 km)*: **₹129**
* `Medium` *(200 km – 600 km)*: **₹149**
* `Long` *(> 600 km)*: **₹199**

### B. Weight & Space Assessment
The system determines the biggest space consumer in the trunk padding—physical weight or dimensional size.
1. **Volumetric Weight**: Evaluated by industry standard formula `(Length × Breadth × Height) / 5000`. (All lengths in `cm` input via frontend).
2. **Chargeable Weight Assessment**: Final chargeable unit is derived via `Max(Dead Weight, Volumetric Weight)`.

### C. Weight Slab Surcharges
Applies the following continuous incremental fees depending entirely on `Chargeable Weight` evaluation:
* `0.0 kg — 0.5 kg`: **+₹0**
* `0.5 kg — 1.0 kg`: **+₹50**
* `1.0 kg — 2.0 kg`: **+₹100**
* `2.0 kg — 4.0 kg`: **+₹200**
* `4.0 kg — 8.0 kg`: **+₹300**
* `Above 8.0 kg`: **+₹450** *(Max safety net. Weight inputs over 10kg cap off securely to this multiplier without failing).*

### D. Delivery Type
A flat addition to evaluate urgency requirements:
* `Standard`: **+₹0**
* `Express`: **+₹50**
* `Same Day`: **+₹100**
*(Edge Catch Restriction: "Same Day" delivery flags trigger a system error if the distance bucket equals `long`).*

### E. Final Math Breakdown
*(Distance Base Fare  +  Weight Slab Charge  +  Delivery Type Upcharge)*
**×** **Surge Multiplier (1.0 default)**
=================================
_Result == Subtotal._

*(Subtotal × Platform Fee %)* = Platform Fee
*(Platform Fee × GST %)* = Tax Payable
**Total Final Receipt == Subtotal + Platform Fee + Tax Payable.**

---
### Scalability Controls
* The MongoDB Schema models configuration metrics seamlessly to RAM (`_cachedConfig`). Admin panel alterations apply immediately avoiding heavy pod boots or downtime. 
