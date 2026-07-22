# Contributing

Thanks for helping improve README Motion Gallery.

## Development workflow

1. Start from the latest `dev` branch.
2. Create a focused branch such as `feature/<issue>-description`, `fix/<issue>-description`, or `docs/<issue>-description`.
3. Install development dependencies with `python -m pip install -e ".[dev]"`.
4. Run `ruff check .` and `pytest`.
5. Include tests for behavior changes.
6. Open a pull request targeting `dev`. Link the issue with `Closes #N` and explain the user-visible result and any GIF size impact.
7. Squash-merge feature and fix pull requests after CI passes. Because `main` is the default branch, close the issue manually after the change is accepted into `dev`.

Do not open ordinary feature pull requests against `main`.

## Release workflow

`dev` is the integration branch. `main` is release-only.

1. Complete and close every issue in the target GitHub Milestone.
2. Confirm that `dev` contains only changes intended for the release.
3. Update `pyproject.toml`, `src/readme_motion_gallery/__init__.py`, and `CHANGELOG.md` together.
4. Open a release pull request from `dev` to `main`.
5. Require CI to pass and merge the release pull request with a merge commit.
6. Tag the resulting `main` commit with `vX.Y.Z` and publish a GitHub Release.
7. Merge or fast-forward the released `main` state back into `dev` before starting the next release train.

For an urgent production fix, branch from `main`, merge the reviewed fix into `main`, release a patch version, and sync the result back into `dev`.

## Project boundaries

Keep rendering deterministic and local-first. Remote URL fetching, hosted rendering, browser-side production GIF encoding, and automatic repository commits require separate design and security review.

The private `readme-motion-gallery-action-test` repository is an external release-acceptance fixture. Product code, Issues, Milestones, and release planning belong in this public repository.
