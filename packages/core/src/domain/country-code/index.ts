import { DomainError } from "../errors/index.js";

// ISO 3166-1 alpha-2 codes. Keep this local list so validation is deterministic
// and does not depend on a network service. The standard currently assigns 249
// codes to countries and territories.
export const ISO_3166_1_ALPHA_2_CODES =
  "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW".split(
    " ",
  ) as readonly string[];

const countryCodes = new Set(ISO_3166_1_ALPHA_2_CODES);

export type CountryCode = string;

/** Parses user input into a current ISO 3166-1 alpha-2 country or territory code. */
export function parseCountryCode(input: string): CountryCode {
  const code = input.trim().toUpperCase();

  if (!/^[A-Z]{2}$/.test(code) || !countryCodes.has(code)) {
    throw new DomainError(
      "INVALID_COUNTRY_CODE",
      `"${input}" is not a valid ISO 3166-1 alpha-2 country code.`,
      { input, country: code },
    );
  }

  return code;
}
