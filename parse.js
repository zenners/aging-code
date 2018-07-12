// import Papa from 'papaparse'
var moment = require("moment");
var Papa = require("papaparse");
var fs = require("fs");
function transFactory(b) {
  if (!b[11]) {
    return {
      type: "Due",
      debit: parseFloat(b[6]),
      term: b[4],
      credit: 0,
      date: b[10],
      order: 3
    };
  } else if (b[11] === "Fees") {
    return {
      type: "Penalty",
      debit: parseFloat(b[7]),
      term: b[4],
      credit: 0,
      date: b[12],
      order: 2
    };
  } else {
    return {
      type: "Payment",
      debit: 0,
      term: b[4],
      credit: b[9].split(",").join(""),
      date: b[12],
      order: 1
    };
  }
}

function calculateAging(diffInDays, amount) {
  if (diffInDays === 0) return ["today", amount];
  else if (30 >= diffInDays && diffInDays >= 1) return ["1-30", amount];
  else if (60 >= diffInDays && diffInDays >= 31) return ["31-60", amount];
  else if (90 >= diffInDays && diffInDays >= 61) return ["61-90", amount];
  else if (120 >= diffInDays && diffInDays >= 91) return ["91-120", amount];
  else return ["120 & over", amount];
}

var dueObj = function(cb) {
  console.log("here");
  var file = fs.readFileSync("./due.csv", "utf8");

  Papa.parse(file, {
    complete: results => {
      const data = results.data.reduce((a, b) => {
        const key = b[0];
        const due = { amount: parseFloat(b[2]), monthlyDue: b[3] };
        const date = new Date();
        const mom = moment(due.monthlyDue, "MM/DD/YYYY");
        const now = moment(date, "MM/DD/YYYY");
        const diffInDays = mom.diff(now, "days") * -1;

        const trick = calculateAging(diffInDays, due.amount);
        const subKey = trick[0];
        const amt = parseFloat(trick[1]);

        if (key in a) {
          a[key][subKey] += amt;
          a[key]["total"] += amt;
        } else {
          const newObj = {
            today: 0,
            "1-30": 0,
            "31-60": 0,
            "61-90": 0,
            "91-120": 0,
            "120 & over": 0,
            total: 0
          };
          a[key] = newObj;
          a[key][trick[0]] = parseFloat(trick[1]);
          a[key]["total"] = parseFloat(trick[1]);
        }
        return a;
      }, {});
      console.log(data);

      cb(data);
    }
  });
};

var getData = function(cb) {
  var file = fs.readFileSync("./cl.csv", "utf8");
  Papa.parse(file, {
    complete: results => {
      console.log(results.data.length);
      const data = results.data.reduce((a, b) => {
        const varDate = new Date(b[10]);
        const today = new Date();
        const key = b[5];

        if (varDate > today) return a; // remove future dues

        const trans = transFactory(b);

        if (key in a) a[key]["transactions"].push(trans);
        else {
          const obj = {
            name: b[0],
            loanId: b[5],
            userId: b[3],
            mi: b[6],
            loanAccountNo: b[2],
            mobileno: b[1],
            streetaddress: b[14] + ", " + b[15],
            term: b[18],
            loanAmount: b[17],
            modelNo: b[20],
            productType: b[19],
            serial: b[20],
            transactions: [trans]
          };
          a[key] = obj;
        }
        return a;
      }, {}); // end of reduce

      const x = Object.keys(data).map(cust => {
        var amountDue = 0;
        const rows = data[cust].transactions // prepare data
          .sort(function(a, b) {
            if (a.date === b.date) return a.order > b.order ? -1 : 1;

            return new Date(a.date) - new Date(b.date);
          })
          .map(z => {
            if (z.type === "Due" || z.type === "Penalty")
              amountDue += parseFloat(z.debit);
            else amountDue -= parseFloat(z.credit);

            return { ...z, amountDue: amountDue.toFixed(2) };
          });
        return { ...data[cust], transactions: rows };
      }); // end of initial map
      console.log(x);
      cb(x, data); // call setState for example
    }
  });
};

module.exports = {
  dueObj: dueObj,
  getData: getData
};
