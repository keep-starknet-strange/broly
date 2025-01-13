export const mockAddress = '1234567890abcdef1234567890abcde';

export const mockInscriptionViews = [
  {
    inscription_id: 1,
    inscription_data: "Hello, Bitcoin!",
    type: "text"
  },
  {
    inscription_id: 2,
    inscription_data: "https://ordiscan.com/content/c17dd02a7f216f4b438ab1a303f518abfc4d4d01dcff8f023cf87c4403cb54cai0",
    type: "image"
  },
  {
    inscription_id: 3,
    inscription_data: "Hello, World 2!\nThis is multiline text.\nThis text is long.\nSo long that you will need to scroll\nif you want to see all of it.\nLorum\nIpsum\nYo yo yo!\nThis is multiline text.\nThis text is long.\nSo long that you will need to scroll\nif you want to see all of it.\nThis is multiline text.\nThis text is long.\n",
    type: "text"
  },
  {
    inscription_id: 4,
    inscription_data: "https://ordiscan.com/content/1008850869eb564cad900c316a02f65854f531b31a2ef96bacecd536be96b031i0",
    type: "image"
  },
  {
    inscription_id: 5,
    inscription_data: "https://ordiscan.com/content/79e63d4fd4f98d239394443798cabf6482821b94042fd299233ff93acb83bf63i0",
    type: "image"
  },
  {
    inscription_id: 6,
    inscription_data: "https://ordiscan.com/content/406e019545eb6e31592ba3859261018f8391af889d2791c2a0c1182964f1339ei0",
    type: "image"
  },
  {
    inscription_id: 7,
    inscription_data: "Bitcoin Message sent from Starknet!",
    type: "text"
  },
  {
    inscription_id: 8,
    inscription_data: "https://www.quantumcats.xyz/collection/vwoieaperz/cat0000.png",
    type: "image"
  },
  {
    inscription_id: 9,
    inscription_data: "0x62000100\nOP_CAT\n0x62000100",
    type: "text"
  },
  {
    inscription_id: 10,
    inscription_data: "https://ordiscan.com/content/6fb976ab49dcec017f1e201e84395983204ae1a7c2abf7ced0a85d692e442799i0",
    type: "image"
  },
  {
    inscription_id: 11,
    inscription_data: "The Times 03/Jan/2009 Chancellor on brink of second bailout for banks.",
    type: "text"
  },
  {
    inscription_id: 12,
    inscription_data: "100K BTC",
    type: "text"
  },
  {
    inscription_id: 13,
    inscription_data: "https://ordiscan.com/content/e3e29332b269d0ae3fa28ac80427065d31b75f2c92baa729a3f8de363a0d66f6i0",
    type: "image"
  },
  {
    inscription_id: 14,
    inscription_data: "https://www.quantumcats.xyz/collection/vwoieaperz/cat0001.png",
    type: "image"
  },
  {
    inscription_id: 15,
    inscription_data: "https://ordiscan.com/content/31833061114c2ee53d63dba53ef0bc2af741c87463cf573a4e211196883a5f2di0",
    type: "gif"
  },
  {
    inscription_id: 16,
    inscription_data: "BIP-420 - https://github.com/bip420/bip420",
    type: "text"
  },
];

export const mockRequestViews = [
  {
    inscription_id: 1,
    requester: "0x1234567890abcdef1234567890abcdef12345678",
    bitcoin_address: "1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2",
    fee_token: "STRK",
    fee_amount: 2000,
    inscription_data: "Hello, Starknet!",
    type: "text"
  },
  {
    inscription_id: 2,
    requester: "0x1234567890abcdef1234567890abcdef12345678",
    bitcoin_address: "1BvESEYstWetqTFn5Au4m4GFg7xJaNVN2",
    fee_token: "STRK",
    fee_amount: 20000,
    inscription_data: "https://www.quantumcats.xyz/collection/vwoieaperz/cat0004.png",
    type: "image"
  },
  {
    inscription_id: 3,
    requester: "Brandon",
    bitcoin_address: "1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2",
    fee_token: "STRK",
    fee_amount: 2000,
    inscription_data: "Hello, World 2!\nThis is multiline text.\nThis text is long.\nSo long that you will need to scroll\nif you want to see all of it.\nLorum\nIpsum\nYo yo yo",
    type: "text"
  },
  {
    inscription_id: 4,
    requester: "0x1234567890abcdef1234567890abcdef12345678",
    bitcoin_address: "1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN",
    fee_token: "STRK",
    fee_amount: 2000,
    inscription_data: "https://ordiscan.com/content/2edd2a1972beafeee32c98ca64ea48d1eccd012963bc4066895d74d35ad40209i0",
    type: "gif"
  },
  {
    inscription_id: 5,
    requester: "0x543210fedcba09876543210fedcba09876543210",
    bitcoin_address: "1BvBMSEYstWetqTFn5Au4m4GFg7xJaNVN2",
    fee_token: "STRK",
    inscription_data: "image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAFE2lUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4KPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iWE1QIENvcmUgNS41LjAiPgogPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4KICA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIgogICAgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIgogICAgeG1sbnM6cGhvdG9zaG9wPSJodHRwOi8vbnMuYWRvYmUuY29tL3Bob3Rvc2hvcC8xLjAvIgogICAgeG1sbnM6ZXhpZj0iaHR0cDovL25zLmFkb2JlLmNvbS9leGlmLzEuMC8iCiAgICB4bWxuczp0aWZmPSJodHRwOi8vbnMuYWRvYmUuY29tL3RpZmYvMS4wLyIKICAgIHhtbG5zOnhtcE1NPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvbW0vIgogICAgeG1sbnM6c3RFdnQ9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZUV2ZW50IyIKICAgeG1wOkNyZWF0ZURhdGU9IjIwMjQtMDktMjRUMjA6NTE6MjYtMDQ6MDAiCiAgIHhtcDpNb2RpZnlEYXRlPSIyMDI0LTA5LTI0VDIxOjA0OjQ0LTA0OjAwIgogICB4bXA6TWV0YWRhdGFEYXRlPSIyMDI0LTA5LTI0VDIxOjA0OjQ0LTA0OjAwIgogICBwaG90b3Nob3A6RGF0ZUNyZWF0ZWQ9IjIwMjQtMDktMjRUMjA6NTE6MjYtMDQ6MDAiCiAgIHBob3Rvc2hvcDpDb2xvck1vZGU9IjMiCiAgIHBob3Rvc2hvcDpJQ0NQcm9maWxlPSJzUkdCIElFQzYxOTY2LTIuMSIKICAgZXhpZjpQaXhlbFhEaW1lbnNpb249IjMyIgogICBleGlmOlBpeGVsWURpbWVuc2lvbj0iMzIiCiAgIGV4aWY6Q29sb3JTcGFjZT0iMSIKICAgdGlmZjpJbWFnZVdpZHRoPSIzMiIKICAgdGlmZjpJbWFnZUxlbmd0aD0iMzIiCiAgIHRpZmY6UmVzb2x1dGlvblVuaXQ9IjIiCiAgIHRpZmY6WFJlc29sdXRpb249IjMwMC8xIgogICB0aWZmOllSZXNvbHV0aW9uPSIzMDAvMSI+CiAgIDx4bXBNTTpIaXN0b3J5PgogICAgPHJkZjpTZXE+CiAgICAgPHJkZjpsaQogICAgICBzdEV2dDphY3Rpb249InByb2R1Y2VkIgogICAgICBzdEV2dDpzb2Z0d2FyZUFnZW50PSJEZXNpZ25lciBpUGFkIDIuNS41IgogICAgICBzdEV2dDp3aGVuPSIyMDI0LTA5LTI0VDIxOjA0OjQ0LTA0OjAwIi8+CiAgICA8L3JkZjpTZXE+CiAgIDwveG1wTU06SGlzdG9yeT4KICA8L3JkZjpEZXNjcmlwdGlvbj4KIDwvcmRmOlJERj4KPC94OnhtcG1ldGE+Cjw/eHBhY2tldCBlbmQ9InIiPz6ndv1cAAABgWlDQ1BzUkdCIElFQzYxOTY2LTIuMQAAKJF1kctLQkEUhz+1sIdRUIGLFhLWSqMHRG2ClLBAQsyg10ZvPgK1y71KSNugrVAQtem1qL+gtkHrICiKIFq3LmpTcTtXBSVyhpnzzW/OOZw5A9ZIWsnoDYOQyea0cMDnWlhcctlfacYJjNEdVXR1MhQKUnd8PmAx7Z3XzFXf79/RuhrXFbA0CU8oqpYTnhYObuRUk3eFu5RUdFX4XNijSYHC96YeK/Oryckyf5usRcJ+sHYIu5I1HKthJaVlhOXluDPpvFKpx3yJI56dnxPbK6sHnTABfLiYYQo/owwxLvsoXoYZkBN14gdL8bOsS6wiu0oBjTWSpMjhETUv2eNiE6LHZaYpmP3/21c9MTJczu7wQeOLYbz3gX0HfoqG8XVsGD8nYHuGq2w1fv1IPvBD9GJVcx9C+xZcXFe12B5cboPzSY1q0ZJkk2VNJODtDNoWofMWWpbLPavcc/oIkU35qhvYP4B+8W9f+QVucmfpqkekxwAAAAlwSFlzAAAuIwAALiMBeKU/dgAAAeVJREFUWIXFV7FuhTAMPFAXJoZuHcnKxof0W/mQt7HyRjYGJsZ0qBwZxzYBIb2Tqr6Y2Hd2EgeAD6O64zTEIWr2V/W6HO/rDunebwCAELrjJDanVMzpJCIm0hKE0GEZ1yIh7sMhDpET84zn+Z3ZuY0L8USYDzi5RqCJseZ5IlSjzPwqQuiKRWQGi/ys/NIuhVgiDoMhDvHn9zsraSmptQSeiEzA3m/mpiqF599M7UFALcnJUStnM7WH7JupRTO1GQH587n0e++3Q0+pubMMHkKX/pZxxd5v6Xw3U4u937D3WxJBNhqTCBKVNS4pgDsQ2Ty/EzllQM8J0sZFkK+sFKECjuWXweX4CrxYtBdqz4GyuQstlqxEEiDXR24wbez95v+t8h8EaEdGKpbLZAWWdlkJnmwtJ8ps5BpaJBahdkp4snXm7QiSgZ9ADfzf2bLJaPCyLl0OslE3TC3RO4pPoJla0D3DBZy+knlZl4AnQo1uwZps5m34ZBW0BkTPsgrQDvWO2VV4iZgvJPKtBtDfdLyxtMnsAeUY0omQuEPOoZEDxiZ8Va8KcYjoy4JbID+LHHAakVUJgrzfrfveI3cFcBHLuJ42KY347JsAKOgDKUAcYoP/ili7ehlX0JzHPs00PPlx+nH8AWUNpPdBaWh5AAAAAElFTkSuQmCC",
    type: "image"
  }
];

export const mockInscription = {
  inscription_id: 1,
  inscription_data: "https://www.quantumcats.xyz/collection/vwoieaperz/cat0000.png",
  type: "image",
  owner: "Brandon",
  sat_number: "1,012,345,678,910",
  minted: new Date(),
  minted_block: 800000,
  properties: [
    {
      name: "Rarity",
      value: "Legendary",
    },
    {
      name: "Color",
      value: "Purple",
    },
    {
      name: "Shape",
      value: "Round",
    },
  ]
};
