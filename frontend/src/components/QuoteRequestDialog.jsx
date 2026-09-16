import { useState } from 'react';
import { useShedStore } from '../store/shedStore';
import { requestQuote, validateContact, validateDesignConfig } from '../services/designApi';
import { placementIssues } from '../utils/placementValidator';
import { wallHeightFt } from '../utils/modelSpec';

/**
 * The terminal action: send this Design to the shop, with a way to reply.
 *
 * No payment and no checkout (ADR-0008) — sheds this size need delivery and
 * site preparation, so there is a human in the transaction regardless. This
 * asks for what that human needs to pick up the phone.
 *
 * It promises no timeframe. What the shop commits to is the shop's to say, and
 * software that invents "within 24 hours" is writing a cheque somebody else has
 * to cash.
 */
const FIELD = {
	width: '100%',
	background: '#0f172a',
	color: '#e2e8f0',
	border: '1px solid #334155',
	borderRadius: 6,
	padding: '8px 10px',
	fontSize: 13,
	outline: 'none',
};

const LABEL = { display: 'block', color: '#94a3b8', fontSize: 11, marginBottom: 4 };

export const QuoteRequestDialog = ({ isOpen, onClose }) => {
	const getConfig = useShedStore((s) => s.getConfig);
	const [contact, setContact] = useState({ name: '', phone: '', email: '', zip: '', note: '', company: '' });
	const [errors, setErrors] = useState([]);
	const [sending, setSending] = useState(false);
	const [sent, setSent] = useState(null);

	if (!isOpen) return null;

	const set = (key) => (e) => setContact((c) => ({ ...c, [key]: e.target.value }));

	const submit = async (e) => {
		e.preventDefault();
		const config = getConfig();

		// The Design is checked before the contact details: a request for a shed
		// that cannot be built is not worth a phone call. An Opening left
		// hanging off its wall by a resize is exactly that (ADR-0007).
		const design = validateDesignConfig(config);
		const openings = placementIssues(config.placements, {
			width: config.width,
			length: config.length,
			wallHeight: wallHeightFt(config.model),
		});
		const contactErrors = validateContact(contact);
		const all = [
			...(design.isValid ? [] : design.errors),
			...openings.map((i) => `An Opening no longer fits: ${i.summary}`),
			...contactErrors,
		];
		if (all.length) {
			setErrors(all);
			return;
		}

		setSending(true);
		setErrors([]);
		try {
			setSent(await requestQuote(config, contact));
		} catch (err) {
			setErrors([err.userMessage || err.message || 'Could not send the request']);
		} finally {
			setSending(false);
		}
	};

	return (
		<div
			role="dialog"
			aria-modal="true"
			aria-label="Request a quote"
			style={{
				position: 'fixed', inset: 0, zIndex: 50,
				background: 'rgba(2,6,23,0.7)',
				display: 'flex', alignItems: 'center', justifyContent: 'center',
				padding: 16,
			}}
		>
			<div style={{
				width: 'min(420px, 100%)', maxHeight: '90vh', overflowY: 'auto',
				background: '#1e293b', border: '1px solid #334155',
				borderRadius: 10, padding: 18,
			}}>
				{sent ? (
					<div>
						<h2 style={{ color: '#e2e8f0', fontSize: 16, margin: '0 0 8px' }}>Request sent</h2>
						<p style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.5, margin: '0 0 14px' }}>
							The shop will be in touch to confirm the details and delivery.
							Your reference is <strong style={{ color: '#cbd5e1' }}>{sent.id}</strong>.
						</p>
						<button onClick={onClose} style={{
							width: '100%', padding: '9px 0', background: '#16a34a', color: '#fff',
							border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer',
						}}>
							Done
						</button>
					</div>
				) : (
					<form onSubmit={submit}>
						<h2 style={{ color: '#e2e8f0', fontSize: 16, margin: '0 0 4px' }}>Request a quote</h2>
						<p style={{ color: '#94a3b8', fontSize: 12, lineHeight: 1.5, margin: '0 0 14px' }}>
							No payment now. Someone at the shop confirms the details, the site and
							delivery before anything is built.
						</p>

						{errors.length > 0 && (
							<ul style={{
								margin: '0 0 12px', padding: '8px 10px 8px 26px',
								background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.35)',
								borderRadius: 6, color: '#fca5a5', fontSize: 12,
							}}>
								{errors.map((e) => <li key={e}>{e}</li>)}
							</ul>
						)}

						<div style={{ display: 'grid', gap: 10 }}>
							<div>
								<label style={LABEL} htmlFor="quote-name">Name</label>
								<input id="quote-name" style={FIELD} value={contact.name} onChange={set('name')} autoComplete="name" />
							</div>
							<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
								<div>
									<label style={LABEL} htmlFor="quote-phone">Phone</label>
									<input id="quote-phone" style={FIELD} value={contact.phone} onChange={set('phone')} autoComplete="tel" />
								</div>
								<div>
									<label style={LABEL} htmlFor="quote-email">Email</label>
									<input id="quote-email" style={FIELD} value={contact.email} onChange={set('email')} autoComplete="email" />
								</div>
							</div>
							<div>
								<label style={LABEL} htmlFor="quote-zip">Delivery ZIP</label>
								<input id="quote-zip" style={FIELD} value={contact.zip} onChange={set('zip')} autoComplete="postal-code" />
							</div>
							<div>
								<label style={LABEL} htmlFor="quote-note">Anything the shop should know</label>
								<textarea id="quote-note" rows={3} style={{ ...FIELD, resize: 'vertical' }} value={contact.note} onChange={set('note')} />
							</div>
						</div>

						{/* A honeypot: hidden from people, irresistible to a bot filling
						    every field. A filled one is answered like any other request
						    and stored nowhere. */}
						<input
							type="text"
							name="company"
							value={contact.company}
							onChange={set('company')}
							tabIndex={-1}
							autoComplete="off"
							aria-hidden="true"
							style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
						/>

						<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 14 }}>
							<button type="button" onClick={onClose} style={{
								padding: '9px 0', background: '#334155', color: '#cbd5e1',
								border: 'none', borderRadius: 7, fontSize: 13, cursor: 'pointer',
							}}>
								Cancel
							</button>
							<button type="submit" disabled={sending} style={{
								padding: '9px 0', background: sending ? '#15803d' : '#16a34a', color: '#fff',
								border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600,
								cursor: sending ? 'not-allowed' : 'pointer',
							}}>
								{sending ? 'Sending…' : 'Send request'}
							</button>
						</div>
					</form>
				)}
			</div>
		</div>
	);
};
