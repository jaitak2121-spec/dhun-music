# Search indexing

The public download page has a canonical URL, descriptive metadata, share image, robots.txt and sitemap.xml. Account screens are marked noindex. These files help discovery; they do not guarantee ranking or inclusion.

To finish ownership verification, open Google Search Console with the project owner's account, add the URL-prefix property `https://dhun-cloud.vercel.app/`, choose HTML-file verification and place the exact supplied file in `cloud/public/`. Deploy it, verify ownership, then submit `https://dhun-cloud.vercel.app/sitemap.xml`. Do not invent a verification token or put it into private environment variables: Google must be able to fetch the verification file publicly.

Use URL Inspection on `/download` and request indexing after verification. A custom domain can be added later; update canonicals, sitemap, robots and share URLs together when doing so.
