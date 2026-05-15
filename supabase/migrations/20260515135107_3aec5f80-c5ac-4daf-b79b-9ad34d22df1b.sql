UPDATE public.assessment_invites
SET status='pending', started_at=NULL, submitted_at=NULL, updated_at=now()
WHERE token='0q0w211r47482v5q5r351o2p6c01011j';