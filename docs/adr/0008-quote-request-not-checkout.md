# Quote Request, Not Checkout

The terminal action for a customer is submitting a Design together with their contact details, for a human to follow up and confirm. The product does not take payment.

Sheds in this catalog run $5,000–$14,000 and require delivery and site preparation, so there is a human in the transaction regardless. Building checkout would pull PCI scope, refunds, and delivery scheduling into a product that cannot yet place a door on a wall.

## Consequences

- The server-side price **is** the Quote — the number a customer is held to — so the catalog is served from the backend and the client keeps no copy of the truth.
- A Design must carry contact information and survive a server restart before this flow is real.
- Payment, if it ever arrives, arrives after a human has confirmed the order, not before.
