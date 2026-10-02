export interface SMSFixture {
  bank: string;
  rawSMS: string;
  expectedAmount: number;
  expectedMerchant: string;
  expectedPaymentMethod: string;
  expectedReference?: string;
}

export const SMS_FIXTURES: SMSFixture[] = [
  {
    bank: 'HDFC',
    rawSMS: 'Sent Rs. 450.00 from HDFC Bank A/C *4092 to VPA starbucks@upi on 26-AUG-26 ref 4231908123',
    expectedAmount: 450,
    expectedMerchant: 'Starbucks',
    expectedPaymentMethod: 'UPI',
    expectedReference: '4231908123',
  },
  {
    bank: 'ICICI',
    rawSMS: 'Rs 1,200.00 debited from ICICI Bank A/C *1092; info: SWIGGY*BANGALORE IN. Ref 987123',
    expectedAmount: 1200,
    expectedMerchant: 'Swiggy Bangalore',
    expectedPaymentMethod: 'DEBIT_CARD',
    expectedReference: '987123',
  },
];
