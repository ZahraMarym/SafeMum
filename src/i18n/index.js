import * as Localization from 'expo-localization';
import { I18n } from 'i18n-js';

import en from '@/locale/en';
import ur from '@/locale/ur';

const i18n = new I18n({
  en,
  ur,
});

i18n.enableFallback = true;
i18n.locale = Localization.locale || 'en';

export default i18n;
