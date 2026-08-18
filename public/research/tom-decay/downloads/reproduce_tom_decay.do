* TOM Anomaly Decay — public reproduction script
* Frozen research tool: qtomdecay 0.3.1
* Expected validation environment:
*   StataNow 18.5 MP
*   Python 3.11.16
*   pandas 2.0.3
*
* This script intentionally uses relative output directories.
* Install/add qtomdecay 0.3.1 to adopath before running.

version 18.5
clear all
set more off

capture mkdir "tom_decay_outputs"
capture mkdir "tom_decay_outputs/yahoo_sp500"
capture mkdir "tom_decay_outputs/french_us_market_1950"

which qtomdecay

display "=== TOM DECAY: YAHOO S&P 500 1950+ ==="

qtomdecay ^GSPC, ///
    source(yahoo) ///
    from("1950-01-01") ///
    rollingyears(10) ///
    breakminyears(10) ///
    save("tom_decay_outputs/yahoo_sp500") ///
    replace

display "=== TOM DECAY: KENNETH FRENCH US MARKET 1950+ MATCHED ==="

qtomdecay USMKT, ///
    source(french) ///
    from("1950-01-01") ///
    rollingyears(10) ///
    breakminyears(10) ///
    save("tom_decay_outputs/french_us_market_1950") ///
    replace

display "=== TOM DECAY REPRODUCTION COMPLETE ==="
