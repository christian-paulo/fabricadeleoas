
-- 1. POSTS table
CREATE TABLE public.posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  caption TEXT NOT NULL DEFAULT '',
  image_urls TEXT[] NOT NULL DEFAULT '{}',
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT caption_length CHECK (char_length(caption) <= 500),
  CONSTRAINT max_images CHECK (array_length(image_urls, 1) IS NULL OR array_length(image_urls, 1) <= 4)
);

CREATE INDEX idx_posts_pinned_created ON public.posts (is_pinned DESC, created_at DESC);
CREATE INDEX idx_posts_profile ON public.posts (profile_id);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read posts"
  ON public.posts FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create own posts"
  ON public.posts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = profile_id AND is_pinned = false);

CREATE POLICY "Users can update own posts (no pin)"
  ON public.posts FOR UPDATE TO authenticated
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id AND is_pinned = false);

CREATE POLICY "Admins can update any post (incl pin)"
  ON public.posts FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can delete own posts"
  ON public.posts FOR DELETE TO authenticated
  USING (auth.uid() = profile_id);

CREATE POLICY "Admins can delete any post"
  ON public.posts FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- update trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER update_posts_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. POST_LIKES table
CREATE TABLE public.post_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (post_id, profile_id)
);

CREATE INDEX idx_post_likes_post ON public.post_likes (post_id);
CREATE INDEX idx_post_likes_profile ON public.post_likes (profile_id);

ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read likes"
  ON public.post_likes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can like as themselves"
  ON public.post_likes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can unlike own"
  ON public.post_likes FOR DELETE TO authenticated
  USING (auth.uid() = profile_id);

-- 3. PROFILES: notify_likes preference
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notify_likes BOOLEAN NOT NULL DEFAULT true;

-- 4. STORAGE bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('post-images', 'post-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can view post images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'post-images');

CREATE POLICY "Users can upload own post images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'post-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own post images"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'post-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Admins can delete any post image"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'post-images'
    AND public.has_role(auth.uid(), 'admin')
  );
