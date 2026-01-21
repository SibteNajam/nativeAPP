interface GateioAccountFee {
  "user_id": number;
  "taker_fee": string;
  "maker_fee": string;
  "gt_discount": boolean;
  "gt_taker_fee": string;
  "gt_maker_fee": string;
  "loan_fee": string;
  "point_type": string;
  "futures_taker_fee": string;
  "futures_maker_fee": string;
  "delivery_taker_fee": string;
  "delivery_maker_fee": string;
  "debit_fee": number;
}