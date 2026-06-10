// machigai-salad: Amazon affiliate products.
//
// アソシエイト ID は kako-jun の `ultimate-battle-22`。
// amzn.to 短縮リンクを使用 (Associates ダッシュボードで生成)。
// 画像 URL は `https://m.media-amazon.com/images/P/{ASIN}.01._SL500_.jpg` 形式。

export interface AffiliateProduct {
  /** amzn.to 短縮 URL */
  url: string
  /** 商品タイトル（短縮可） */
  title: string
  /** Amazon CDN 商品画像 URL */
  imageUrl: string
  /** kako-jun の一言コメント */
  caption: string
}

export const AFFILIATE_PRODUCTS: AffiliateProduct[] = [
  {
    url: 'https://amzn.to/4wVSk5q',
    title: 'サイゼリヤのまちがいさがし',
    imageUrl: 'https://m.media-amazon.com/images/P/B07FFNXLQ8.01._SL500_.jpg',
    caption: 'このアプリのこうかはばつぐんだ！',
  },
  {
    url: 'https://amzn.to/4a8NR5B',
    title: '頭がよくなる 超いじわる まちがいさがし',
    imageUrl: 'https://m.media-amazon.com/images/P/B0DB7QQX1J.01._SL500_.jpg',
    caption: 'さらなる高みへ！',
  },
  {
    url: 'https://amzn.to/3PseBXZ',
    title: 'ピタゴラスイッチ ピタゴラゴール1号',
    imageUrl: 'https://m.media-amazon.com/images/P/B00OPTZRF0.01._SL500_.jpg',
    caption: 'うちのは旗が折れて声だけになった！',
  },
]
