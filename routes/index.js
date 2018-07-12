var express = require("express");
var router = express.Router();
var request = require("superagent");
var Aging = require("../models/Aging");
var Ledger = require("../models/Ledger");

var Parse = require("../parse");

/* GET home page. */
router.get("/", function(req, res, next) {
  res.render("index", { title: "Express" });
});

router.get("/rehydrate/aging", (req, res) => {
  const date = "2018-06-04";
  console.log("requesting...");
  request
    .post("https://api360.zennerslab.com/Service1.svc/agingReportJson")
    // .post("https://rfc360-test.zennerslab.com/Service1.svc/agingReportJson")
    .send(date ? { date: date } : {})
    .end((err, result) => {
      if (err) console.log(err);

      console.log("got data");
      console.log(result.body.agingReportJsonResult);

      //   const data = result.body.agingReportJsonResult;
      //   console.log(data);
      //   Aging.create(data)
      //     .then(foo => {
      //       // console.log(foo);

      //       res.json(foo);
      //     })
      //     .catch(err => console.log(err));
    });
});

router.get("/rehydrate/ledger", (req, resp) => {
  Parse.getData((data, obj) => {
    // use callback function to pass and arrow function for scoping
    Parse.dueObj(res => {
      const x = data.map(bar => {
        const name = bar.name;
        return { ...bar, ...res[name] };
      });

      Ledger.create(x)
        .then(foo => {
          resp.json(foo);
        })
        .catch(err => console.log(err));
      // this.setState({ data: x, copy: x, count: x.length, obj })
    });
  });
});

router.get("/clear/ledger", (req, res) => {
  Ledger.remove({}, err => {
    if (err) console.log(err);

    res.send("cleared ledger");
  });
});

router.get("/ledger", (req, res) => {
  Ledger.find({}, (err, data) => {
    if (err) console.log(err);

    res.json(data);
  });
});

router.get("/ledger/today", (req, res) => {
  Ledger.find({ today: { $gt: 0 } }, (err, data) => {
    if (err) console.log(err);

    res.json(data);
  });
});

router.get("/reports/aging", function(req, resp) {
  console.time("queryTime");
  const date = req.query.date;
  request
    .post("https://api360.zennerslab.com/Service1.svc/agingReportJson")
    .send(date ? { date: date } : {})
    .end((err, res) => {
      if (err) console.log(err);

      console.timeEnd("queryTime");
      const result = JSON.parse(res.text);
      const data = result.agingReportJsonResult;
      const x = data.map(loan => {
        const y = loan.dueObj.reduce(
          (a, b) => {
            const mom = moment(b.dueDate, "YYYY-MM-DD");
            const now = moment(date, "MM/DD/YYYY");
            const diffInDays = mom.diff(now, "days") * -1;
            const daysElapsed = elapseCurried(a, b.amount);
            if (diffInDays === 0) daysElapsed("today");
            else if (30 >= diffInDays && diffInDays >= 1) daysElapsed("1-30");
            else if (60 >= diffInDays && diffInDays >= 31) daysElapsed("31-60");
            else if (90 >= diffInDays && diffInDays >= 61) daysElapsed("61-90");
            else if (120 >= diffInDays && diffInDays >= 91)
              daysElapsed("91-120");
            else daysElapsed("120 & over");

            a.total = a.total + b.amount;
            return a;
          },
          {
            today: 0,
            "1-30": 0,
            "31-60": 0,
            "61-90": 0,
            "91-120": 0,
            "120 & over": 0,
            total: 0
          }
        );

        return {
          loanaccountNumber: `'${loan.loanAccountNo}`,
          appId: loan.appId,
          name: loan.name,
          mlv: loan.bMLV,
          pnv: loan.bPNV,
          mi: loan.monthlyInstallment,
          ...y
        };
      });

      const fields = [
        "appId",
        "name",
        "loanaccountNumber",
        "mlv",
        "pnv",
        "mi",
        "today",
        "1-30",
        "31-60",
        "61-90",
        "91-120",
        "120 & over",
        "total"
      ];
      // const json2csvParser = new Json2csvParser({ fields });
      // const csv = json2csvParser.parse(x);
      var d = date ? date : new Date();
      const filestr = `Aging as of ${d}`;
      const filename = `attachment; filename=${filestr}.csv`;

      resp.csv(x, true, { "Content-disposition": filename });
    });
});

module.exports = router;
