---
title: "Security in Angular: sanitization, DomSanitizer, CSP and XSRF"
summary: "How Angular protects against XSS: escaping in interpolation and sanitizing [innerHTML], the risk in bypassSecurityTrustHtml, CSP with autoCsp, Trusted Types, and HttpClient's XSRF protection."
date: 2026-10-20
tags: [angular]
series: { key: angular, order: 75 }
---

Most of Angular's XSS protection works without you doing anything, and breaks when you bypass it. This post shows what Angular does on its own, where you bypass it, and what you add on top: CSP, Trusted Types and XSRF protection.

Every example was checked with Angular 22.2 and Vitest. The full rules are in the [security guide](https://angular.dev/best-practices/security).

## Interpolation, innerHTML and bypassing

```typescript
import { Component, inject, input } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'app-comment',
  template: `
    <p>{{ html() }}</p>
    <div class="safe" [innerHTML]="html()"></div>
    <div class="trusted" [innerHTML]="trusted()"></div>
  `,
})
export class Comment {
  readonly html = input('');
  private readonly sanitizer = inject(DomSanitizer);
  // Dangerous: Angular no longer checks this value.
  protected trusted = () => this.sanitizer.bypassSecurityTrustHtml(this.html());
}
```

A test passes `<b>hi</b><img src="x" onerror="alert(1)">` to `html`, and prints the HTML of each of the three elements and the console warning:

```text
WARNING: sanitizing HTML stripped some content, see https://angular.dev/best-practices/security#preventing-cross-site-scripting-xss
p: &lt;b&gt;hi&lt;/b&gt;&lt;img src="x" onerror="alert(1)"&gt;
safe: <b>hi</b><img src="x">
trusted: <b>hi</b><img src="x" onerror="alert(1)">
```

- **Interpolation** always escapes: the tags show as text and aren't interpreted.
- **`[innerHTML]`** is sanitized: `<b>` stays, and `onerror` is removed. In development mode Angular prints a warning when it changes a value.
- **`bypassSecurityTrustHtml`** inserts the value as is, `onerror` included. In a real browser this code would run.

Per the guide, Angular sanitizes values in three contexts: HTML, style and URL. A resource URL, like `<script src>`, it doesn't sanitize at all, because it can contain any code. Each context has its own `bypassSecurityTrust*` method, and you use it only on a value you created or checked, never on user input. When you must work with the DOM directly, `sanitizer.sanitize(SecurityContext.HTML, value)` sanitizes a value the same way.

## CSP with autoCsp

A Content Security Policy tells the browser which sources may run scripts. `autoCsp` in `angular.json` generates such a policy at build time:

```json
"build": {
  "builder": "@angular/build:application",
  "options": {
    "security": { "autoCsp": true }
  }
}
```

The built `index.html` got a tag at the top of `<head>`:

```text
<meta http-equiv="Content-Security-Policy" content="script-src 'strict-dynamic' 'sha256-wF0Y260ovXauJMW0rJcr7ehPGcq9k3TMfOWs2BNmVuE=' https: 'unsafe-inline';object-src 'none';base-uri 'self';">
```

The CLI computes a hash for every inline script in `index.html`, and `'strict-dynamic'` lets the approved script load the rest of the files. That makes CSP possible on a static site too, without a nonce that changes per request. Per the guide, `autoCsp` covers only scripts (you set `style-src` yourself) and doesn't work with SSR. The option's description in the builder schema says it will become the default "once we are out of experimental/preview phases", so it isn't stable yet.

With a server that can generate a nonce per response, the guide suggests `ngCspNonce` on the root element or the `CSP_NONCE` token.

## Trusted Types

Trusted Types is a browser feature that blocks assigning a plain string to a dangerous API like `innerHTML`. Angular supports it through policies with fixed names. Per the guide, the minimal header is:

```text
Content-Security-Policy: trusted-types angular; require-trusted-types-for 'script';
```

`angular` covers values Angular sanitized. An app that uses `bypassSecurityTrust*` also needs `angular#unsafe-bypass`, and lazy loading chunks needs `angular#bundler`. The benefit: every bypass needs an explicitly named policy, so it's easy to find. Browser support isn't complete, and `DomSanitizer` keeps working either way.

## XSRF in HttpClient

```typescript
import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

describe('XSRF', () => {
  it('sends the cookie value as a header on POST only', () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    document.cookie = 'XSRF-TOKEN=abc123';
    const http = TestBed.inject(HttpClient);
    const backend = TestBed.inject(HttpTestingController);

    http.post('/api/save', {}).subscribe();
    http.get('/api/items').subscribe();

    const post = backend.expectOne('/api/save').request;
    const get = backend.expectOne('/api/items').request;
    console.log('POST', post.headers.get('X-XSRF-TOKEN'), '| GET', get.headers.get('X-XSRF-TOKEN'));
    expect(post.headers.get('X-XSRF-TOKEN')).toBe('abc123');
    expect(get.headers.has('X-XSRF-TOKEN')).toBe(false);
  });
});
```

```text
POST abc123 | GET null
```

`HttpClient` reads the `XSRF-TOKEN` cookie and sends it in an `X-XSRF-TOKEN` header, only on requests that change data (such as POST) and only to relative or same-origin URLs. Another site can't read the cookie, so it can't send the header. But this is only half the protection: the server must set the cookie and check that the header matches. Other names are set with `withXsrfConfiguration({ cookieName, headerName })`, and `withNoXsrfProtection()` turns it off.

## Mistakes beginners make

- **`bypassSecurityTrustHtml` to make the warning go away.** The warning says Angular removed something dangerous, and the bypass puts it back.
- **Writing to `element.innerHTML` through `ElementRef`.** DOM APIs aren't sanitized. A template binding is better.
- **Thinking XSRF protection works without the server.** Without a server that checks the header, it protects nothing.

## What's next

Next: managing state in a large app. A service with signals, and when to move to NgRx SignalStore.
