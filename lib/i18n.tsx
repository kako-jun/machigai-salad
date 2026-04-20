'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { loadLang, saveLang } from './storage'

export type Lang = 'ja' | 'en'

const dict = {
  // page.tsx — header
  appTitle: { ja: '小エビの間違いサラダ', en: 'Machigai Salad' },
  appSubtitle: { ja: '間違いさがし おたすけツール', en: 'Your spot-the-difference helper!' },
  bannerAlt: { ja: '小エビの間違いサラダ バナー', en: 'Machigai Salad banner' },

  // page.tsx — footer
  amazonSupport: { ja: 'Amazon で応援する', en: 'Support on Amazon' },
  amazonHint: {
    ja: 'リンク先の商品でなくても、\nここからお買い物するだけで応援になるよ',
    en: 'Any purchase through this link\nhelps us out — thanks!',
  },
  shareApp: {
    ja: 'おもしろかったら ともだちにも おしえてね',
    en: 'Had fun? Share it with your friends!',
  },
  copied: { ja: 'コピーしたよ', en: 'Copied!' },
  shareText: {
    ja: '間違いさがし おたすけツール「小エビの間違いサラダ」',
    en: 'Machigai Salad — Your spot-the-difference helper!',
  },
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
  checkNetwork: {
    ja: 'ページを もう1回ひらいてみてね',
    en: 'Please reload the page and try again',
  },
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
  saveFailed: { ja: 'ほぞんできなかった...', en: "Couldn't save..." },
  restoreFailed: { ja: 'ふくげんできなかった...', en: "Couldn't open it..." },
  saveBtn: { ja: 'ほぞん', en: 'Save' },
  shareResult: { ja: 'アニメーションをつくる', en: 'Create animation' },
  gifPreviewShare: { ja: 'シェアする', en: 'Share' },
  gifPreviewDownload: { ja: 'ダウンロード', en: 'Download' },
  gifFormatHint: { ja: '(GIF)', en: '(GIF)' },
  pngFormatHint: { ja: '(PNG)', en: '(PNG)' },
  gifPreviewClose: { ja: 'とじる', en: 'Close' },
  shareResultTitle: { ja: 'クネクネ動いて見えるかな？', en: 'Can you see it wiggling?' },
  shareResultText: {
    ja: '「小エビの間違いサラダ」で間違いさがしを比較したよ！',
    en: 'I compared a spot-the-difference puzzle with Machigai Salad!',
  },
  shareFailed: { ja: 'シェアできなかった...', en: "Couldn't share..." },
  shareOnX: { ja: 'Xでシェア', en: 'Share on X' },
  shareOnLine: { ja: 'LINEでシェア', en: 'Share on LINE' },
  copyLink: { ja: 'リンクをコピー', en: 'Copy link' },
  shareVia: { ja: 'シェアする', en: 'Share' },
  retryBtn: { ja: '最初からやり直す', en: 'Start over' },
  savedList: { ja: 'ほぞんしたやつ', en: 'My saves' },

  // ImageComparison
  left: { ja: 'ひだり', en: 'Left' },
  right: { ja: 'みぎ', en: 'Right' },
  dragging: { ja: 'ずらしちゅう...', en: 'Moving...' },
  releaseToReturn: { ja: 'はなすと もどるよ', en: 'Let go to flip back' },
  holdInstruction: {
    ja: '長おし→みぎの絵\nスライド→位置あわせ',
    en: 'Hold → see right\nSlide → adjust position',
  },
  backToAdjust: { ja: 'かどの調整にもどる', en: 'Back to corners' },
  warpAdjusting: { ja: 'かど調整ちゅう...', en: 'Adjusting corner...' },

  // PaperCornersAdjustment
  cornersInstruction: {
    ja: 'かどの まるを うごかして\n紙にあわせてね',
    en: 'Move the dots to\nmatch the paper corners!',
  },
  redetect: { ja: 'もう1回けんしゅつ', en: 'Re-detect' },
  undo: { ja: 'もどす', en: 'Undo' },
  sensitivityStrict: { ja: 'きびしめ', en: 'Strict' },
  sensitivityNormal: { ja: 'ふつう', en: 'Normal' },
  sensitivityLoose: { ja: 'あまめ', en: 'Loose' },
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
  installPrompt: { ja: 'ホーム画面に追加する？', en: 'Add to home screen?' },
  installBtn: { ja: 'インストール', en: 'Install' },
  installDismiss: { ja: 'あとで', en: 'Later' },

  // Album mode popup
  albumModeTitle: { ja: 'どっちの よみこみ？', en: 'How to load?' },
  albumModeOne: { ja: '1まい（左右がうつってる）', en: 'One image (side by side)' },
  albumModeTwo: { ja: '2まい（べつべつの画像）', en: 'Two separate images' },
  pickSecondImage: { ja: '2まい目を えらんでね', en: 'Now pick the second image!' },
  pickSecondImageBtn: { ja: '2まい目を えらぶ', en: 'Pick 2nd image' },
  cancelTwoImage: { ja: 'やめる', en: 'Cancel' },
  step1stImage: { ja: '1まい目', en: '1st' },
  step2ndImage: { ja: '2まい目', en: '2nd' },

  // LINE in-app browser warning
  lineInAppWarning: {
    ja: 'LINEアプリ内ではカメラが使えないことがあるよ',
    en: 'Camera may not work inside the LINE app',
  },
  lineInAppOpenExternal: {
    ja: '外部ブラウザで開く',
    en: 'Open in browser',
  },
  iosLineModalTitle: {
    ja: 'Safariで開いてね',
    en: 'Please open in Safari',
  },
  iosLineModalDesc: {
    ja: 'iPhoneのLINEからは カメラをつかうのが むずかしいんだ。\nしたの てじゅんで Safariで ひらいてね。',
    en: "The LINE app on iPhone can't open the camera directly.\nFollow the steps below to open this page in Safari.",
  },
  iosLineModalStep1: {
    ja: '右下の「・・・」メニューをタップ',
    en: "Tap the '...' menu in the bottom right",
  },
  iosLineModalStep2: {
    ja: '「他のアプリで開く」または「Safariで開く」を選ぶ',
    en: "Select 'Open in another app' or 'Open in Safari'",
  },
  copyUrl: { ja: 'URLをコピー', en: 'Copy URL' },
  urlCopied: { ja: 'コピーしたよ', en: 'Copied!' },
  close: { ja: '閉じる', en: 'Close' },

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
    const stored = loadLang()
    if (stored) {
      setLangState(stored)
      return
    }
    if (!navigator.language.startsWith('ja')) {
      setLangState('en')
    }
  }, [])

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    saveLang(l)
  }, [])

  const t = useCallback((key: DictKey) => dict[key][lang], [lang])

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>
}

export function useI18n() {
  return useContext(I18nContext)
}
