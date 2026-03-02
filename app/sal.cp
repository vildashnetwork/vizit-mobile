#include <iostream>

using namespace std;

class employee{
public:
    int employyeID;
    char name[100];
    double salary;


    void setEmployee(int id , char name[100] ){
         cout<<"my name is"<<name<<" and my id is  "<<id<<endl;
    }
     void setEmployee(int id , char name[100] , double salary){
          cout<<"my name is"<< name<< " and my id is "<<id<< "and my salary is "<<salary<<endl;
    }

    void calculateAnnualSalary(int months, double salary){
        double annualSalary = (salary / months) * 12;
        cout << "Annual Salary: " << annualSalary << endl;
    }

};

int main()
{

employee emp;
emp.setEmployee(2, "che fortune");
emp.setEmployee(4, "orsa blissz");

    return 0;
}
emp.setEmployee(3, "john doe", 50000.0);
emp.setEmployee(5, "jane smith", 65000.0);

employee emp2;
emp2.setEmployee(6, "mike wilson");
emp2.setEmployee(7, "sarah jones", 75000.0);