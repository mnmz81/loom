import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import type { Lang } from '../../core/content.models';
import { LocaleService } from '../../core/i18n/locale.service';
import { PATHS } from '../../core/routes.const';
import { SeoService } from '../../core/seo.service';
import { SITE } from '../../core/site.config';
import { allLangPaths } from '../seo-helpers';

interface Statement {
  title: string;
  lead: string;
  doneTitle: string;
  done: string[];
  limitsTitle: string;
  limits: string[];
  contactTitle: string;
  contactBefore: string;
  contactAfter: string;
  updated: string;
}

const STATEMENT: Record<Lang, Statement> = {
  he: {
    title: 'הצהרת נגישות',
    lead: 'לום הוא בלוג אישי ללמידה. אני רוצה שכל אחד יוכל לקרוא אותו, כולל אנשים עם מוגבלות. האתר נבנה כדי לעמוד בהנחיות WCAG ברמה AA, שעליהן מבוסס התקן הישראלי ת"י 5568, ובתקנות שוויון זכויות לאנשים עם מוגבלות (התאמות נגישות לשירות), התשע"ג-2013.',
    doneTitle: 'מה נעשה באתר',
    done: [
      'אפשר לנווט בכל האתר במקלדת בלבד. הפוקוס גלוי, ויש קישור "דלג לתוכן" בראש כל עמוד.',
      'מבנה כותרות סמנטי, ותוויות לאזורי הניווט, לקוראי מסך.',
      'שפת הדף וכיוון הקריאה (ימין לשמאל או שמאל לימין) מוגדרים, וגם תוכן בשפה אחרת בתוך הדף מסומן.',
      'ניגודיות צבעים ברמה AA בערכת הנושא הבהירה ובכהה. הערכה נבחרת לפי הגדרת המכשיר, ואפשר להחליף אותה בכפתור בראש העמוד.',
      'אפשר להגדיל את הטקסט עד 200% ולצפות באתר במסך צר בלי גלילה אופקית של העמוד.',
      'האתר מכבד את ההעדפה "הפחתת תנועה" של מערכת ההפעלה.',
      'בכל בנייה של האתר רצות בדיקות נגישות אוטומטיות (axe) על עמודי המפתח, בשתי השפות ובשתי ערכות הנושא.',
    ],
    limitsTitle: 'מגבלות ידועות',
    limits: [
      'חלק מהפוסטים קיימים בשפה אחת בלבד. הם מסומנים ככאלה ומוצגים בשפה שבה נכתבו.',
      'בלוקי קוד ארוכים וטבלאות רחבות גוללים אופקית בתוך האלמנט עצמו.',
      'האתר לא עבר בדיקה של מומחה נגישות חיצוני. תוכן חדש מתווסף לעיתים קרובות, ויכול להיות שיימצא בו ליקוי.',
    ],
    contactTitle: 'פנייה בנושא נגישות',
    contactBefore: 'מצאתם ליקוי, או צריכים תוכן בפורמט נגיש יותר? אפשר לפנות לרכז הנגישות, ',
    contactAfter: ', במייל. נטפל בכל פנייה ונחזור אליכם תוך 14 יום.',
    updated: 'ההצהרה עודכנה לאחרונה ב-',
  },
  en: {
    title: 'Accessibility statement',
    lead: 'Loom is a personal learning blog. I want everyone to be able to read it, including people with disabilities. The site is built to meet WCAG level AA, the basis of Israeli Standard SI 5568, and the Israeli Equal Rights for Persons with Disabilities (Service Accessibility Adjustments) Regulations, 2013.',
    doneTitle: 'What the site does',
    done: [
      'The whole site works with a keyboard alone. Focus is always visible, and every page starts with a "Skip to content" link.',
      'Headings are semantic, and navigation areas are labelled for screen readers.',
      'The page language and reading direction (right to left or left to right) are set, and content in another language inside a page is marked.',
      'Color contrast meets level AA in both the light and the dark theme. The theme follows the device setting, and a button in the header switches it.',
      'Text can be enlarged to 200%, and the site works on a narrow screen without sideways scrolling of the page.',
      'The site respects the operating system "reduce motion" setting.',
      'Automated accessibility tests (axe) run on the key pages on every build, in both languages and both themes.',
    ],
    limitsTitle: 'Known limitations',
    limits: [
      'Some posts exist in one language only. They are marked and shown in the language they were written in.',
      'Long code blocks and wide tables scroll sideways inside the element itself.',
      'The site has not been reviewed by an external accessibility expert. New content is added often and may contain a defect.',
    ],
    contactTitle: 'Accessibility feedback',
    contactBefore: 'Found a barrier, or need content in a more accessible format? Contact the accessibility coordinator, ',
    contactAfter: ', by email. Every report gets handled, with a reply within 14 days.',
    updated: 'This statement was last updated on ',
  },
};

/** `/:lang/accessibility` — the accessibility statement required of Israeli service websites (regulation 35). */
@Component({
  selector: 'nb-accessibility-page',
  templateUrl: './accessibility-page.html',
  styleUrl: './accessibility-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'data-pagefind-ignore': '' },
})
export class AccessibilityPage {
  protected readonly locale = inject(LocaleService);
  protected readonly text = computed(() => STATEMENT[this.locale.lang()]);
  protected readonly author = SITE.author;
  protected readonly email = SITE.accessibility.email;
  protected readonly updatedIso = SITE.accessibility.updated;
  protected readonly updated = computed(() => this.locale.formatDate(SITE.accessibility.updated));

  constructor() {
    const seo = inject(SeoService);
    effect(() => {
      const lang = this.locale.lang();
      seo.set({
        lang,
        title: STATEMENT[lang].title,
        description: STATEMENT[lang].lead,
        path: PATHS.accessibility(lang),
        alternates: allLangPaths(PATHS.accessibility),
      });
    });
  }
}
