import { ChevronRight } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { hasSupabaseConfig, readSupabaseSession, signInWithEmail, signUpWithEmail, readReportReviewNotice, acceptReportReviewNotice, submitSupabaseReport } from "../lib/supabaseApi";
import { usePlaces } from "../state/PlacesContext";
import { reportReviewNoticeVersion, isFoodCategory, reportValidationError, type ConfirmationType, type ConfirmationAnswer, type ReportSource } from "@knogo/core";
import styles from "./ConfirmPage.module.css";
import { ReportAssessmentReceipt } from "./ReportAssessmentReceipt";

type Step = {
  type: ConfirmationType;
  question: string;
  options: Array<{ label: string; value: string }>;
};

const steps: Step[] = [
  {type:"open_status",question:"Is the place open?",options:[{label:"Open",value:"open"},{label:"Closed",value:"closed"}]},
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
  const { places, addConfirmation, refreshPlace } = usePlaces();
  const [index, setIndex] = useState(-1);
  const [done, setDone] = useState(false);
  const [reportId,setReportId]=useState<string|null>(null);
  const [session, setSession] = useState(() => readSupabaseSession());
  const [authMode, setAuthMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [noticeAccount,setNoticeAccount]=useState<string|null>(null);
  const [noticeLoading,setNoticeLoading]=useState(false);
  const [adult,setAdult]=useState(false);
  const [reportSource,setReportSource]=useState<ReportSource|null>(null);
  const [sourceUrl,setSourceUrl]=useState("");
  const [answers,setAnswers]=useState<ConfirmationAnswer[]>([]);
  const place = places.find((item) => item.id === placeId);
  const questions=place && !isFoodCategory(place.category)?steps.filter(step=>step.type!=="kitchen_status"):steps;
  const step = questions[index];
  useEffect(()=>{
    let active=true;
    setNoticeAccount(null);setAdult(false);
    if(hasSupabaseConfig && session){
      setNoticeLoading(true);
      void readReportReviewNotice().then(value=>{if(active && value.accepted)setNoticeAccount(session.userId);})
        .catch(()=>{if(active)setSubmitError("Could not load the report notice. Reload to try again.");})
        .finally(()=>{if(active)setNoticeLoading(false);});
    }
    return()=>{active=false;};
  },[session?.userId]);

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

  const answer = (value: string) => {
    setAnswers(current=>[...current.filter(answer=>answer.type!==step.type),...(value==="not_sure"?[]:[{type:step.type,value}])]);
    setIndex(index+1);
  };
  const submit = async () => {
    if(isSubmitting)return;
    setSubmitError("");
    setIsSubmitting(true);

    try {
      const validation=reportValidationError({answers,reportSource,sourceUrl});
      if(validation)throw new Error(validation);
      if(hasSupabaseConfig) {
        const result=await submitSupabaseReport({placeId:place.id,answers,reportSource:reportSource!,sourceUrl:sourceUrl.trim()||undefined});
        setReportId(result.reportId);
        void refreshPlace(place.id).catch(()=>undefined);
      }
      else for(const answer of answers) await addConfirmation(place.id,answer.type,answer.value);
      setDone(true);
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
          <h1>Report received.</h1>
          <p>Other checks may be needed before the status changes.</p>
          {reportId&&session?<ReportAssessmentReceipt key={`${session.userId}:${reportId}`} reportId={reportId} onReviewed={()=>{void refreshPlace(place.id).catch(()=>undefined);}}/>:null}
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
      ) : hasSupabaseConfig && noticeAccount!==session?.userId ? <section className={styles.card}>
        <Link to={`/restaurants/${place.id}`}>Back to place</Link>
        <h1>{noticeLoading?"Checking report access":"Before you report"}</h1>
        {!noticeLoading?<>
          <p>Reporting is for testers aged 18 or over. Gemini reviews coded answers and timing patterns, not truth. Google may use this data to improve its unpaid service, with human review. Your email, location and source links are excluded.</p>
          <p>Report detail is removed after 24 hours during cleanup. Your account keeps a contribution count.</p>
          <label><input type="checkbox" checked={adult} onChange={event=>setAdult(event.target.checked)}/> I am 18 or over and agree to this use</label>
          <button className={styles.authSubmit} disabled={!adult||isSubmitting} onClick={async()=>{setIsSubmitting(true);setSubmitError("");try{await acceptReportReviewNotice({version:reportReviewNoticeVersion,adultConfirmed:adult});setNoticeAccount(session!.userId);}catch{setSubmitError("Could not save the report notice. Try again.");}finally{setIsSubmitting(false);}}}>Agree and continue</button>
        </>:null}
        {submitError?<p role="alert" className={styles.error}>{submitError}</p>:null}
      </section> : index===-1 ? <section className={styles.card}>
        <Link to={`/restaurants/${place.id}`}>Back to place</Link><h1>How did you check?</h1>
        <div className={styles.options}>{([['in_person','At the venue'],['phone','By phone'],['online','Online']] as const).map(([value,label])=><button key={value} aria-pressed={reportSource===value} onClick={()=>setReportSource(value)}>{label}</button>)}</div>
        {reportSource==="online"?<label>Source website<input value={sourceUrl} onChange={event=>setSourceUrl(event.target.value)} type="url"/></label>:null}
        <button className={styles.authSubmit} disabled={!reportSource||(reportSource==="online"&&!/^https?:\/\/[^\s/]+/.test(sourceUrl.trim()))} onClick={()=>setIndex(0)}>Continue</button>
      </section> : index===questions.length ? <section className={styles.card}>
        <h1>Review your check</h1>
        {answers.map(answer=><p key={answer.type}>{questions.find(step=>step.type===answer.type)?.question} {answer.value}</p>)}
        {submitError?<p role="alert" className={styles.error}>{submitError}</p>:null}
        <button className={styles.authSubmit} disabled={isSubmitting||!answers.length} onClick={()=>void submit()}>Submit check</button>
        <button className={styles.skip} disabled={isSubmitting} onClick={()=>setIndex(0)}>Edit answers</button>
      </section> : (
      <section className={styles.card}>
        <div className={styles.progress} aria-label={`Step ${index + 1} of ${questions.length}`}>
          {questions.map((progressStep, stepIndex) => (
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
        <button className={styles.skip} type="button" disabled={isSubmitting} onClick={() => {setAnswers(current=>current.filter(answer=>answer.type!==step.type));setIndex(index+1);}}>
          Skip
        </button>
      </section>
      )}
    </div>
  );
}
