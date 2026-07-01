'use client';

import React from 'react';
import { useForm, ValidationError } from '@formspree/react';
import c from '@/styles/Content.module.css';
import f from './page.module.css';

const Contact = () => {
    const [state, handleSubmit] = useForm('xvgpgppd');

    return (
        <div className={c.page}>
            <h1 className={c.title} data-chunk='1'>
                Get in <span className={c.titleAccent}>touch</span>.
            </h1>
            <p
                className={c.lead}
                data-chunk='1'
                style={{ ['--ci']: 1 } as React.CSSProperties}
            >
                Questions, a false positive, or a homograph the scanner missed?
                Send a note and a reply will follow.
            </p>

            {state.succeeded ? (
                <div
                    className={f.success}
                    role='status'
                    aria-live='polite'
                    aria-atomic='true'
                    data-chunk='2'
                >
                    <span className={f.successTick} aria-hidden />
                    <div>
                        <div className={f.successTitle}>MESSAGE RECEIVED</div>
                        <div className={f.successBody}>
                            Thanks for reaching out. A reply will follow soon.
                        </div>
                    </div>
                </div>
            ) : (
                <form className={f.form} onSubmit={(e) => void handleSubmit(e)}>
                    <div className={f.group} data-chunk='2'>
                        <label htmlFor='name' className={f.label}>
                            Name
                        </label>
                        <input
                            id='name'
                            name='name'
                            type='text'
                            required
                            autoComplete='name'
                            className={f.input}
                        />
                        <ValidationError
                            prefix='Name'
                            field='name'
                            errors={state.errors}
                            className={f.error}
                        />
                    </div>
                    <div
                        className={f.group}
                        data-chunk='2'
                        style={{ ['--ci']: 1 } as React.CSSProperties}
                    >
                        <label htmlFor='email' className={f.label}>
                            Email
                        </label>
                        <input
                            id='email'
                            name='email'
                            type='email'
                            required
                            autoComplete='email'
                            className={f.input}
                        />
                        <ValidationError
                            prefix='Email'
                            field='email'
                            errors={state.errors}
                            className={f.error}
                        />
                    </div>
                    <div
                        className={f.group}
                        data-chunk='2'
                        style={{ ['--ci']: 2 } as React.CSSProperties}
                    >
                        <label htmlFor='message' className={f.label}>
                            Message
                        </label>
                        <textarea
                            id='message'
                            name='message'
                            required
                            rows={5}
                            className={f.textarea}
                        />
                        <ValidationError
                            prefix='Message'
                            field='message'
                            errors={state.errors}
                            className={f.error}
                        />
                    </div>
                    <button
                        type='submit'
                        className={f.submit}
                        disabled={state.submitting}
                        data-chunk='2'
                        style={{ ['--ci']: 3 } as React.CSSProperties}
                    >
                        {state.submitting ? 'SENDING' : 'SEND MESSAGE'}
                    </button>
                </form>
            )}
        </div>
    );
};

export default Contact;
