import { ChevronRight } from "lucide-react";
import { type FormEvent, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { hasSupabaseConfig, readSupabaseSession, signInWithEmail, signUpWithEmail } from "../lib/supabaseApi";
import { usePlaces } from "../state/PlacesContext";
import type { ConfirmationType } from "@knogo/core/types/place";
import styles from "./ConfirmPage.module.css";

type Step = {
  type: ConfirmationType;
  question: string;
  options: Array<{ label: string; value: string }>;
};

const steps: Step[] = [
  {
    type: "kitchen_status",
    question: "Were they still serving?",
    options: [
      { label: "Yes", value: "yes" },
      { label: "No", value: "no" },
      { label: "Not sure", value: "not_sure" }
    ]
  },
  {
    type: "busy_level",
    question: "How busy was it?",
    options: [
      { label: "Quiet", value: "quiet" },
      { label: "Normal", value: "normal" },
      { label: "Busy", value: "busy" },
      { label: "Packed", value: "packed" }
    ]
  },
  {
    type: "walk_ins",
    question: "Could you get a table?",
    options: [
      { label: "Yes", value: "yes" },
      { label: "No", value: "no" },
      { label: "Did not try", value: "not_sure" }
    ]
  },
  {
    type: "card_machine",
    question: "Was the card machine working?",
    options: [
      { label: "Yes", value: "yes" },
      { label: "No", value: "no" },
      { label: "Cash only", value: "cash_only" },
      { label: "Not sure", value: "not_sure" }
    ]
  },
  {
    type: "backup_power",
    question: "Were they operating during power issues?",
    options: [
      { label: "Operating", value: "normal" },
      { label: "Limited", value: "limited" },
      { label: "Closed", value: "closed" },
      { label: "Not sure", value: "not_sure" }
    ]
  }
];

export function ConfirmPage() {
  const { placeId } = useParams();
  const { places, addConfirmation } = usePlaces();
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState(false);
  const [session, setSession] = useState(() => readSupabaseSession());
  const [authMode, setAuthMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const place = places.find((item) => item.id === placeId);
  const step = steps[index];

  if (!place) {
    return (
      <div className={styles.card}>
        <h1>Place not found</h1>
        <Link to="/restaurants">Back to restaurants</Link>
      </div>
    );
  }

  const submitAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError("");

    try {
      const nextSession =
        authMode === "sign-in"
          ? await signInWithEmail(email.trim(), password)
          : await signUpWithEmail(email.trim(), password);
      setSession(nextSession);
      setPassword("");
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Could not sign in.");
    }
  };

  const answer = async (value: string) => {
    setSubmitError("");
    setIsSubmitting(true);

    try {
      await addConfirmation(place.id, step.type, value);
      if (index === steps.length - 1) {
        setDone(true);
      } else {
        setIndex(index + 1);
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Could not save your confirmation.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className={`${styles.page} ${styles.doneShell}`}>
        <section className={styles.donePage}>
          <p className={styles.kicker}>{place.name}</p>
          <h1>Thanks. You helped someone avoid a wasted trip.</h1>
          <div className={styles.actions}>
            <Link to={`/restaurants/${place.id}`}>Continue</Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {hasSupabaseConfig && !session ? (
        <section className={styles.card}>
          <p className={styles.kicker}>{place.name}</p>
          <h1>Sign in to confirm.</h1>
          <p className={styles.helper}>Browsing stays open to everyone. Contributions need an account so KNOGO can protect status quality.</p>
          <form className={styles.authForm} onSubmit={submitAuth}>
            <label>
              Email
              <input value={email} type="email" autoComplete="email" onChange={(event) => setEmail(event.target.value)} required />
            </label>
            <label>
              Password
              <input
                value={password}
                type="password"
                autoComplete={authMode === "sign-in" ? "current-password" : "new-password"}
                minLength={6}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>
            {authError ? <p className={styles.error}>{authError}</p> : null}
            <button className={styles.authSubmit} type="submit">
              {authMode === "sign-in" ? "Sign in" : "Create account"}
            </button>
          </form>
          <button
            className={styles.authSwitch}
            type="button"
            onClick={() => {
              setAuthMode((current) => (current === "sign-in" ? "sign-up" : "sign-in"));
              setAuthError("");
            }}
          >
            {authMode === "sign-in" ? "Need an account?" : "Already have an account?"}
          </button>
        </section>
      ) : (
      <section className={styles.card}>
        <div className={styles.progress} aria-label={`Step ${index + 1} of ${steps.length}`}>
          {steps.map((progressStep, stepIndex) => (
            <button
              key={progressStep.type}
              type="button"
              className={stepIndex <= index ? styles.progressActive : ""}
              aria-current={stepIndex === index ? "step" : undefined}
              aria-label={`Go to step ${stepIndex + 1}`}
              disabled={stepIndex > index}
              onClick={() => setIndex(stepIndex)}
            >
              <span>{stepIndex + 1}</span>
            </button>
          ))}
        </div>
        <p className={styles.kicker}>{place.name}</p>
        <h1>{step.question}</h1>
        <p className={styles.helper}>Tap what you saw. Skip anything you did not check.</p>
        <div className={styles.options}>
          {step.options.map((option) => (
            <button key={option.value} type="button" onClick={() => answer(option.value)}>
              {option.label}
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          ))}
        </div>
        {submitError ? <p className={styles.error}>{submitError}</p> : null}
        <button className={styles.skip} type="button" disabled={isSubmitting} onClick={() => (index === steps.length - 1 ? setDone(true) : setIndex(index + 1))}>
          Skip
        </button>
      </section>
      )}
    </div>
  );
}
