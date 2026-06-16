# BPS Web API Reference

This note summarizes the official BPS Web API documentation for use in this repository.

Primary source:

- Official documentation: <https://webapi.bps.go.id/documentation/>

## Base patterns

The official documentation uses path-style endpoints under:

- `https://webapi.bps.go.id/v1/api/list/...`

Examples in the docs show model selection as a path segment rather than a query string, for example:

- `.../model/data/...`
- `.../model/var/...`
- `.../model/th/...`
- `.../model/turvar/...`
- `.../model/vervar/...`
- `.../model/turth/...`
- `.../model/domain/...`

Requests require a BPS API key:

- `.../key/<BPS_API_KEY>/`

In this repo, keep the key in environment variables such as `BPS_API_KEY`. Do not hardcode it into source files or committed JSON.

## Models we are likely to use

The official docs describe these list models:

- `data`: fetches the actual statistical values
- `var`: lists variables for a domain
- `th`: lists available period entries for a variable
- `turvar`: lists derived-variable members
- `vervar`: lists vertical-variable members
- `turth`: lists derived-period members
- `domain`: lists BPS domains

For dashboard work, the usual discovery flow should be:

1. Find the target `domain`.
2. List candidate variables with `model/var`.
3. Inspect available time points with `model/th`.
4. Inspect dimensions with `model/vervar`, `model/turvar`, or `model/turth` if the table uses them.
5. Fetch final values with `model/data`.

## Data endpoint shape

The official docs show `model/data` requests using path selectors like:

- `domain/<domain_id>`
- `var/<var_id>`
- `th/<period_selector>`
- optional `vervar/<id>`
- optional `turvar/<id>`
- optional `turth/<id>`
- `key/<api_key>`

The docs indicate that selectors can take:

- a single value, such as `th/2024`
- a semicolon-delimited list, such as `th/2023;2024;2025`
- a range, such as `th/2:6`

Do not assume every table uses only `domain`, `var`, and `th`. Many BPS tables also need one or more of:

- `vervar`
- `turvar`
- `turth`

## Response parsing notes

The official documentation does not present `model/data` as a simple flat row list.
Instead, the payload is split into metadata arrays and a `datacontent` object.

The docs show these structures as part of the response shape:

- `var`
- `turvar`
- `vervar`
- `tahun`
- `turtahun`
- `datacontent`

Implications for this repo:

- Parse metadata and values separately.
- Do not assume `datacontent` keys are self-explanatory without the accompanying metadata arrays.
- When building reusable scrapers, normalize the payload into explicit records before saving project JSON.

## Domain notes

The docs include a `domain` model for BPS regional domains. Use it when we need to discover official IDs instead of guessing them.

For labor dashboards, we have already used:

- `0000` for national-level access in some official examples and project scripts

Still, prefer discovery or confirmed prior usage before introducing new domain IDs into code.

## Repo-specific guidance

These are not direct documentation quotes; they are the working conventions for this repository:

- Prefer official BPS Web API over inferred or third-party sources when the indicator is available there.
- Discover table structure first with `var`, `th`, `vervar`, `turvar`, and `turth` before hardcoding selectors.
- Preserve exact observation timing from BPS labels when the series is not strictly annual.
- Normalize BPS responses into explicit records before using them in UI code.
- Keep API fetch logic separate from presentation logic.

## Known working repo pattern

For the TPT historical work in this repository, the existing verified pattern is:

- variable: `var/543`
- period discovery: `model/th`

Treat that as a known working case for this repo, not as a universal shortcut for every BPS dataset. New indicators should still be discovered from the official API structure first.

## Suggested implementation checklist

Before building a new BPS-backed scraper or page:

1. Confirm the target domain.
2. Discover the variable ID with `model/var`.
3. Fetch available periods with `model/th`.
4. Check whether the table also requires `vervar`, `turvar`, or `turth`.
5. Fetch a small sample from `model/data`.
6. Normalize the response into readable records.
7. Save source metadata alongside the transformed output.

