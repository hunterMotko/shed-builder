# Triage Labels

The skills speak in terms of five canonical triage roles. This file maps those roles to the actual label strings used in this repo's issue tracker.

| Label in mattpocock/skills | Label in our tracker | Meaning                                  |
| -------------------------- | -------------------- | ---------------------------------------- |
| `needs-triage`             | `needs-triage`       | Maintainer needs to evaluate this issue  |
| `needs-info`               | `needs-info`         | Waiting on reporter for more information |
| `ready-for-agent`          | `ready-for-agent`    | Fully specified, ready for an AFK agent  |
| `ready-for-human`          | `ready-for-human`    | Requires human implementation            |
| `wontfix`                  | `wontfix`            | Will not be actioned                     |

When a skill mentions a role (e.g. "apply the AFK-ready triage label"), use the corresponding label string from this table.

Edit the right-hand column to match whatever vocabulary you actually use.

## The two labels every issue carries

An issue carries exactly **one category** (`bug`, `enhancement`, `documentation`) and
exactly **one state** from the table above. The category says what kind of thing it is;
the state says where it is in the pipeline. An issue with only a category has not been
triaged — it is invisible to both queries below.

## The queues

The point of the state label is that picking work becomes a query instead of a reread:

```bash
gh issue list --state open --label ready-for-agent   # hand to an agent
gh issue list --state open --label ready-for-human   # your own list
```

The line between them is not difficulty. It is whether a machine can finish the job:

- **`ready-for-agent`** — the spec is complete and the acceptance criteria are checkable
  without a person. Mechanical work with a known answer.
- **`ready-for-human`** — finishing it needs judgment, a design call, external access, or
  a sign-off. The fidelity issues live here permanently: their acceptance criterion is a
  human looking at a render beside a photograph, which no agent can supply.

## Blocked is not a state

There are five states and none of them is "blocked", because blocking is a *relationship*
between two issues rather than a property of one. Use GitHub's native issue dependencies
(see `issue-tracker.md`), which the UI renders and `gh` can query:

```bash
gh api repos/<owner>/<repo>/issues/<n>/dependencies/blocked_by --jq '[.[]|"#\(.number)"]'
```

So a fully-specified issue queued behind another still gets `ready-for-agent`, plus an
edge naming its blocker. Downgrading it to `needs-triage` instead would be a lie — the
spec is fine, the timing isn't — and the state would have to be remembered and reverted
when the blocker closes. The edge does that on its own: an issue is pickable when it is
`ready-for-agent` and its `blocked_by` list has no open issues left in it.
