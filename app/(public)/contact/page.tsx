"use client";

import React from "react";
import { useForm, ValidationError } from "@formspree/react";
import contact from "@/styles/css/Contact.module.css";

const Contact = () => {
  const [state, handleSubmit] = useForm("xvgpgppd");

  if (state.succeeded) {
    return (
      <div className={contact.container}>
        <h1 className={contact.heading}>Contact Us</h1>
        <p className={contact.submittedMessage}>
          Thank you for contacting us! We will get back to you soon.
        </p>
      </div>
    );
  }

  return (
    <div className={contact.container}>
      <h1 className={contact.heading}>Contact Us</h1>
      <form className={contact.form} onSubmit={handleSubmit}>
        <div className={contact.formGroup}>
          <label htmlFor='name' className={contact.label}>
            Name:
          </label>
          <input
            type='text'
            id='name'
            name='name'
            required
            className={contact.input}
          />
          <ValidationError prefix='Name' field='name' errors={state.errors} />
        </div>
        <div className={contact.formGroup}>
          <label htmlFor='email' className={contact.label}>
            Email:
          </label>
          <input
            type='email'
            id='email'
            name='email'
            required
            className={contact.input}
          />
          <ValidationError prefix='Email' field='email' errors={state.errors} />
        </div>
        <div className={contact.formGroup}>
          <label htmlFor='message' className={contact.label}>
            Message:
          </label>
          <textarea
            id='message'
            name='message'
            required
            className={contact.textarea}
          ></textarea>
          <ValidationError
            prefix='Message'
            field='message'
            errors={state.errors}
          />
        </div>
        <button
          type='submit'
          className={contact.submitButton}
          disabled={state.submitting}
        >
          Submit
        </button>
      </form>
    </div>
  );
};

export default Contact;
