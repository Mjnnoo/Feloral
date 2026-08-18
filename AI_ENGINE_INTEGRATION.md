# AI Engine Integration

## Overview

Feloral uses a separated AI Engine service for Virtual Makeup Try-On.

The main Feloral application is responsible for:
- Users
- Products
- Orders
- Sessions
- Business logic
- Authentication

The AI Engine is responsible for:
- Face analysis
- Face region detection
- Makeup rendering
- Image processing


---

# Architecture




User
|
| Upload selfie
|
Feloral Backend
|
| Create Try-On Job
|
AI Engine (FastAPI)
|
| Face Analysis
| Mask Generation
| Product Rendering
|
Generated Result
|
Feloral Backend
|
User Preview







---

# Repositories

## Main Application

Repository:

https://github.com/Mjnnoo/Feloral


Responsibilities:

- Frontend
- Backend APIs
- Database
- Product management
- User management
- Virtual Try-On workflow


---

## AI Engine

Repository:

https://github.com/Mjnnoo/feloral-ai-engine


Responsibilities:

- Computer Vision processing
- Face landmark detection
- Region mask generation
- Makeup rendering


---

# AI Engine Technology Stack

Current stack:

- Python 3.10
- FastAPI
- MediaPipe
- OpenCV
- NumPy


---

# Current AI Pipeline

Current flow:




Input Image
|
v

MediaPipe Face Detection
|
v

FaceAnalyzer
|
v

Region Masks
|
+----------------+
|                |
v                v

Lip Renderer Future Renderers
|
v

Final Try-On Image


---

# Current Implemented Features

## Lipstick Virtual Try-On

Status: Completed


Implemented:

- Lip landmark detection
- Outer lip mask
- Inner mouth removal
- Soft edge blending
- Lip texture extraction
- Natural color transfer


Current files:


ai-engine

face/
├── analyzer.py
└── lip_texture.py

makeup/
└── lip_renderer.py

masks/

├── lips_outer.png
├── lips_inner.png
├── lip_edge.png
└── lip_texture.png




---

# Design Principle

Each cosmetic product should only affect its related face region.


Examples:


## Lipstick

Input:

Lip product

Changes:

Only lips


---

## Contact Lens

Input:

Lens product

Changes:

Only iris color


Must preserve:

- pupil
- eye reflection
- eye texture


---

## Foundation

Input:

Foundation product

Changes:

Only skin


Must preserve:

- eyes
- lips
- facial texture


---

## Blush

Input:

Blush product

Changes:

Only cheek area


---

# Future Pipeline

Planned renderers:


makeup/

├── lip_renderer.py
├── eye_renderer.py
├── skin_renderer.py
└── cheek_renderer.py



---

# Local Development

Run AI Engine:

```bash
cd feloral-ai-engine

.\venv\Scripts\activate

python -m uvicorn main:app --port 8001

AI Engine URL:

http://127.0.0.1:8001

Current Status

Completed:

✅ Face analysis
✅ Region mask generation
✅ Lipstick renderer v2
✅ Natural lip blending

Next:

Contact lens renderer
Foundation renderer
Blush renderer
Product-based rendering API
Integration with Feloral backend
Notes For Future Development

Do not merge AI Engine into the main backend.

Keep AI Engine as an independent service.

Communication should happen through API calls.


