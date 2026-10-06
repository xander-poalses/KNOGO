create index if not exists confirmations_report_batch_id_idx on public.confirmations(report_batch_id);
create index if not exists kitchen_hours_submissions_user_id_idx on public.kitchen_hours_submissions(user_id);
create index if not exists report_audit_log_report_batch_id_idx on public.report_audit_log(report_batch_id);

create policy "No client access to blocked contributors"
on public.blocked_contributors for all to anon, authenticated
using (false) with check (false);

create policy "No client access to report audit log"
on public.report_audit_log for all to anon, authenticated
using (false) with check (false);
