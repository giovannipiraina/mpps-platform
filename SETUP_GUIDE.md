# MPPS Testing Platform — Setup Guide
### You can do this! Estimated time: 45–60 minutes.

---

## What you need before starting
- A computer with Chrome or Edge
- Your school email address
- The project folder (the folder containing this file)

---

## STEP 1 — Create your Supabase account (the database)
*Supabase stores all your test data safely in the cloud.*

1. Go to **https://supabase.com** and click **Start your project**
2. Sign up with your Google account or email
3. Click **New Project**
4. Fill in:
   - **Name**: `mpps-testing`
   - **Database Password**: choose something strong, write it down somewhere safe
   - **Region**: `Southeast Asia (Singapore)` — closest to Melbourne
5. Click **Create new project** — wait about 2 minutes for it to set up

---

## STEP 2 — Set up the database tables

1. In your Supabase project, click **SQL Editor** in the left sidebar
2. Click **New query**
3. Open the file `supabase/schema.sql` from this project folder in Notepad
4. Select ALL the text (Ctrl+A), copy it (Ctrl+C)
5. Paste it into the Supabase SQL Editor (Ctrl+V)
6. Click the green **Run** button
7. You should see "Success. No rows returned" — that means it worked ✓

---

## STEP 3 — Create your admin account

1. In Supabase, click **Authentication** in the left sidebar
2. Click **Add user** → **Create new user**
3. Fill in your email and a password → click **Create user**
4. You'll see your new user appear with a long ID like `a1b2c3d4-...`
5. **Copy that ID** (click it to select, then Ctrl+C)
6. Go back to **SQL Editor**, click **New query**
7. Paste this, replacing the parts in CAPS:

```sql
insert into teachers (id, email, name, role)
values ('PASTE-YOUR-UUID-HERE', 'YOUR-EMAIL-HERE', 'YOUR-NAME-HERE', 'admin');
```

Example:
```sql
insert into teachers (id, email, name, role)
values ('a1b2c3d4-1234-5678-abcd-ef1234567890', 'principal@mpps.vic.edu.au', 'MPPS Admin', 'admin');
```

8. Click **Run** — you should see "Success" ✓

---

## STEP 4 — Get your Supabase keys

1. In Supabase, click **Settings** (gear icon) → **API**
2. You'll see two things you need:
   - **Project URL** — looks like `https://abcdefgh.supabase.co`
   - **anon public** key — a long string starting with `eyJ...`
3. Keep this browser tab open — you'll need these in Step 6

---

## STEP 5 — Get your Anthropic API key
*This powers the AI grading of written answers.*

1. Go to **https://console.anthropic.com**
2. Sign up or log in
3. Click **API Keys** → **Create Key**
4. Name it `mpps-testing` → click **Create Key**
5. Copy the key (starts with `sk-ant-...`) — you can only see it once!

---

## STEP 6 — Configure the project

1. In the project folder, find the file called `.env.example`
2. Make a copy of it and rename the copy to `.env.local`
   - Right-click → Copy, then right-click → Paste, then rename
3. Open `.env.local` in Notepad
4. Fill in your three values:

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...your-full-key...
VITE_ANTHROPIC_API_KEY=sk-ant-api03-...your-key...
```

5. Save the file

---

## STEP 7 — Install Node.js (one-time only)

1. Go to **https://nodejs.org**
2. Download the **LTS** version (the green button)
3. Run the installer — just click Next through everything
4. When done, open **Command Prompt** (press Windows key, type `cmd`, press Enter)
5. Type `node --version` and press Enter
6. You should see something like `v20.11.0` — that means it worked ✓

---

## STEP 8 — Run the project locally (to test it)

1. Open **Command Prompt**
2. Navigate to your project folder by typing:
   ```
   cd Desktop\mpps-platform
   ```
   (adjust the path to wherever you saved the folder)
3. Type this and press Enter:
   ```
   npm install
   ```
   Wait for it to finish (1–2 minutes, you'll see lots of text scrolling)
4. Then type:
   ```
   npm run dev
   ```
5. You should see something like `Local: http://localhost:5173`
6. Open that URL in Chrome — you should see the MPPS Testing Platform! ✓
7. Log in with the admin email and password you created in Step 3

---

## STEP 9 — Deploy to the web (so students can access it)

1. Go to **https://vercel.com** and sign up with your Google account
2. Click **Add New Project**
3. Choose **Deploy from your computer** (or drag and drop the project folder)
4. Before deploying, you need to add your environment variables:
   - Click **Environment Variables**
   - Add each of the three variables from your `.env.local` file:
     - `VITE_SUPABASE_URL` → your Supabase URL
     - `VITE_SUPABASE_ANON_KEY` → your anon key
     - `VITE_ANTHROPIC_API_KEY` → your Anthropic key
5. Click **Deploy**
6. Wait ~2 minutes — Vercel will give you a URL like `mpps-testing.vercel.app`

**That's your school's URL!** Share it with students and teachers.

---

## STEP 10 — First things to do after setup

1. **Log in as admin** at `your-url.vercel.app/teacher`
2. **Create teacher accounts** — go to Teachers tab → Add Teacher
3. **Create classes** — go to Classes tab → Add Class (or let teachers do this)
4. **Upload your first test** — go to Tests tab → Upload New Test → drop in your PDF
5. **Assign the test to a class** — click Assign to Class on the test
6. **Tell students** to go to `your-url.vercel.app` — they'll see the student portal

---

## How teachers log in

Teachers go to: `your-url.vercel.app/teacher`

Students go to: `your-url.vercel.app` (the home page)

---

## Troubleshooting

**"Cannot find module" error when running npm install**
→ Make sure you're in the right folder in Command Prompt. Type `dir` to see what files are there — you should see `package.json`.

**Login says "Invalid credentials"**
→ Double-check you created the teacher row in Step 3. The UUID must match exactly.

**PDF upload doesn't extract questions**
→ Check your Anthropic API key in `.env.local`. Make sure there are no extra spaces.

**Vercel deploy fails**
→ Make sure all 3 environment variables are added before deploying.

---

## Need help?

This platform was built with Claude at claude.ai. If something isn't working, you can describe the problem to Claude and it will help you fix it — just paste any error messages you see.

---

*MPPS Testing Platform · Built with Claude · Victorian Curriculum*
