# Facade Off

A head-to-head voting game for real, recently completed NYC affordable housing buildings. Two buildings appear side by side; you pick the better-designed one and each gains/loses an Elo rating, the same system used to rank chess players.

Built as a companion piece to an NYU Wagner capstone study, *Design Quality in Affordable Housing*, which found that residents are rarely given the design vocabulary or the opportunity to weigh in before a building's design is finalized. This site is a small, public way to practice that vocabulary.

## Data

Seeded with real buildings from NYC Open Data's [Affordable Housing Production by Building](https://data.cityofnewyork.us/Housing-Development/Affordable-Housing-Production-by-Building/hg8x-zxpr/about_data) dataset, spanning all five boroughs. Everything else (votes, Elo ratings, edits) lives in your browser's `localStorage` — add buildings, paste a whole spreadsheet, or export the current set as TSV from the Admin panel.

## Stack

React + Vite, no backend. Run locally:

```
npm install
npm run dev
```
