'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'machigai-salad-lang'

export type Lang = 'ja' | 'en'

const dict = {
  // page.tsx — header
  appTitle: { ja: '小エビの間違いサラダ', en: 'Machigai Salad' },
  appSubtitle: { ja: '間違いさがし おたすけツール', en: 'Your spot-the-difference helper!' },
  bannerAlt: { ja: '小エビの間違いサラダ バナー', en: 'Spot the Difference Salad banner' },

  // page.tsx — footer
  amazonSupport: { ja: 'Amazon で応援する', en: 'Support on Amazon' },
  amazonHint: {
    ja: 'リンク先の商品でなくても、ここから買い物するだけで支援になるよ',
    en: 'Any purchase through this link\nhelps us out — thanks!',
  },
  shareApp: { ja: 'このアプリを共有', en: 'Share this app' },
  authorSite: { ja: '作者のサイト', en: "Maker's site" },

  // ImageUpload
  takePhoto: { ja: 'しゃしんを とる', en: 'Take a photo' },
  preparing: { ja: 'じゅんびちゅう...', en: 'Getting ready...' },
  pickFromAlbum: { ja: 'アルバムから えらぶ', en: 'Pick from album' },
  shootStraight: {
    ja: '間違いさがしの紙を\nまっすぐ撮ってね',
    en: 'Take a nice straight photo\nof the puzzle!',
  },
  loadFailed: { ja: 'よみこめなかったよ', en: "Oops, couldn't load!" },
  imageTooBig: { ja: 'しゃしんが おおきすぎるよ', en: 'This photo is too big!' },
  imageTooSmall: { ja: 'しゃしんが ちいさすぎるよ', en: 'This photo is too small!' },
  checkNetwork: { ja: 'ネットワーク接続を確認してね', en: 'Check your internet and try again' },
  retryLoad: { ja: 'もう1回ためす', en: 'Try again' },

  // ImageProcessor — steps
  step1: { ja: 'さつえい', en: 'Snap' },
  step2: { ja: 'かどあわせ', en: 'Align' },
  step3: { ja: 'くらべる', en: 'Compare' },
  loading: { ja: 'よみこみちゅう...', en: 'Loading...' },
  processing: { ja: 'しょりちゅう...', en: 'Working on it...' },
  processError: {
    ja: 'うまくいかなかったみたい。かどの位置をなおして もう1回ためしてね。',
    en: "Hmm, that didn't work. Fix the corners and try again!",
  },
  saved: { ja: 'ほぞんしたよ', en: 'Saved!' },
  saveFailed: { ja: 'ほぞんできなかった...', en: "Couldn't save..." },
  restoreFailed: { ja: 'ふくげんできなかった...', en: "Couldn't open it..." },
  saveBtn: { ja: 'ほぞん', en: 'Save' },
  retryBtn: { ja: 'もう1回やる', en: 'Do it again' },
  savedList: { ja: 'ほぞんしたやつ', en: 'My saves' },

  // ImageComparison
  left: { ja: 'ひだり', en: 'Left' },
  right: { ja: 'みぎ', en: 'Right' },
  dragging: { ja: 'ずらしちゅう...', en: 'Moving...' },
  releaseToReturn: { ja: 'はなすと もどるよ', en: 'Let go to flip back' },
  holdInstruction: {
    ja: '長おし→みぎの絵\nドラッグ→位置あわせ',
    en: 'Hold → see right\nDrag → adjust position',
  },
  resetPosition: { ja: '位置をリセット', en: 'Reset position' },

  // PaperCornersAdjustment
  cornersInstruction: {
    ja: 'かどの まるを うごかして\n紙にあわせてね',
    en: 'Move the dots to\nmatch the paper corners!',
  },
  cornersResetTitle: { ja: 'かどの位置をもどす', en: 'Put corners back' },
  cornersReset: { ja: 'リセット', en: 'Reset' },
  cornersCancel: { ja: 'やめる', en: 'Cancel' },
  cornersOk: { ja: 'OK! すすむ', en: "OK! Let's go" },

  // SavesPopup
  savesTitle: { ja: 'ほぞんしたやつ', en: 'My saves' },
  savesLimit: {
    ja: 'さいだい5つまで。\nいっぱいになると ふるいのから きえるよ',
    en: 'You can keep up to 5.\nOldest ones go away when full!',
  },
  savesEmpty: { ja: 'まだないよ', en: 'Nothing here yet!' },
  deleteConfirm: { ja: 'ほんとうに けす？', en: 'Really delete?' },
  deleteBtn: { ja: 'けす', en: 'Delete' },

  // PWA install
  installPrompt: { ja: 'ホーム画面に追加できるよ', en: 'Add to your home screen!' },
  installBtn: { ja: 'インストール', en: 'Install' },
  installDismiss: { ja: 'あとで', en: 'Later' },

  // Toast
  toastClose: { ja: '閉じる', en: 'Close' },
} as const

type DictKey = keyof typeof dict

interface I18nContextValue {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (key: DictKey) => string
}

const I18nContext = createContext<I18nContextValue>({
  lang: 'ja',
  setLang: () => {},
  t: (key) => dict[key].ja,
})

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('ja')

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored === 'en' || stored === 'ja') {
        setLangState(stored)
        return
      }
    } catch {}
    if (!navigator.language.startsWith('ja')) {
      setLangState('en')
    }
  }, [])

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    try {
      localStorage.setItem(STORAGE_KEY, l)
    } catch {}
  }, [])

  const t = useCallback((key: DictKey) => dict[key][lang], [lang])

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>
}

export function useI18n() {
  return useContext(I18nContext)
}
